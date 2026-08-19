//+------------------------------------------------------------------+
//| JournalSync.mq5                                                  |
//| Sends completed trades to your journal's webhook when a position |
//| closes. Uses MT5's deal history (not OnTick) since trades are    |
//| recorded as linked entry/exit deals, not single objects.         |
//+------------------------------------------------------------------+
#property strict

input string ServerUrl   = "http://127.0.0.1:3000/api/webhooks/trade"; // change to your deployed URL later
input string LastSyncUrl = "http://127.0.0.1:3000/api/webhooks/last-sync"; // change to your deployed URL later
input string EaSecretKey = "change_me_to_match_EA_SECRET_KEY_in_env";  // must match EA_SECRET_KEY in your .env

// MAE/MFE tracking — MT5's trade history only stores the open and
// close price, not what happened in between, so the only way to know
// how far a trade moved for/against you mid-trade is to watch it live,
// tick by tick, while it's open. These parallel arrays track each
// currently-open position's running worst (MAE) and best (MFE)
// floating profit, keyed by position ticket. Positions that were
// already open before this EA started tracking (EA just launched
// mid-trade, or a trade backfilled via catch-up sync) never get an
// entry here — for those, MAE/MFE genuinely can't be known and are
// simply omitted rather than guessed at.
ulong  g_posTickets[];
double g_posMinProfit[];
double g_posMaxProfit[];

//+------------------------------------------------------------------+
//| On startup, ask the server what the last synced trade for this   |
//| account was, then backfill anything closed since then. Covers    |
//| trades that closed while this EA wasn't running — e.g. MT5 was   |
//| off, or the trade closed from your phone.                        |
//+------------------------------------------------------------------+
int OnInit()
{
   CatchUpSync();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Fires on every price update. Only job here is refreshing the      |
//| MAE/MFE tracking arrays — actual trade-sending stays entirely in  |
//| OnTradeTransaction, so this stays cheap and doesn't duplicate      |
//| any sending logic.                                                 |
//+------------------------------------------------------------------+
void OnTick()
{
   UpdateMaeMfeTracking();
}

//+------------------------------------------------------------------+
//| Find this position's index in the tracking arrays, or -1 if it's  |
//| not being tracked yet (brand new position, or one that was        |
//| already open before this EA started).                             |
//+------------------------------------------------------------------+
int FindTrackedIndex(ulong positionTicket)
{
   for(int i = 0; i < ArraySize(g_posTickets); i++)
   {
      if(g_posTickets[i] == positionTicket)
         return i;
   }
   return -1;
}

//+------------------------------------------------------------------+
//| Loop every currently open position, update its running best/worst |
//| floating profit. Called every tick — cheap since it's just array  |
//| lookups and comparisons, no network calls.                        |
//+------------------------------------------------------------------+
void UpdateMaeMfeTracking()
{
   int total = PositionsTotal();

   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(ticket))
         continue;

      double floatingProfit = PositionGetDouble(POSITION_PROFIT);
      int idx = FindTrackedIndex(ticket);

      if(idx == -1)
      {
         // First tick we've seen this position — start tracking it,
         // both min and max starting at its current floating profit.
         int newSize = ArraySize(g_posTickets) + 1;
         ArrayResize(g_posTickets, newSize);
         ArrayResize(g_posMinProfit, newSize);
         ArrayResize(g_posMaxProfit, newSize);

         g_posTickets[newSize - 1] = ticket;
         g_posMinProfit[newSize - 1] = floatingProfit;
         g_posMaxProfit[newSize - 1] = floatingProfit;
      }
      else
      {
         if(floatingProfit < g_posMinProfit[idx]) g_posMinProfit[idx] = floatingProfit;
         if(floatingProfit > g_posMaxProfit[idx]) g_posMaxProfit[idx] = floatingProfit;
      }
   }
}

//+------------------------------------------------------------------+
//| Remove a position from the tracking arrays once it's closed and   |
//| sent — keeps the arrays from growing forever over the life of the |
//| terminal session.                                                  |
//+------------------------------------------------------------------+
void RemoveTrackedPosition(ulong positionTicket)
{
   int idx = FindTrackedIndex(positionTicket);
   if(idx == -1) return;

   int lastIdx = ArraySize(g_posTickets) - 1;

   // Swap-and-pop: move the last element into this slot, then shrink
   // by one. Order doesn't matter for this array, so this is simpler
   // and cheaper than shifting every element down by one.
   g_posTickets[idx] = g_posTickets[lastIdx];
   g_posMinProfit[idx] = g_posMinProfit[lastIdx];
   g_posMaxProfit[idx] = g_posMaxProfit[lastIdx];

   ArrayResize(g_posTickets, lastIdx);
   ArrayResize(g_posMinProfit, lastIdx);
   ArrayResize(g_posMaxProfit, lastIdx);
}

//+------------------------------------------------------------------+
//| Fires on every trade-related event: order placed, modified,      |
//| deal added, etc. We only care about "a new deal was added",      |
//| and specifically only the CLOSING half of a trade.                |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                         const MqlTradeRequest &request,
                         const MqlTradeResult &result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD)
      return; // not a new deal — ignore (order modifications, etc.)

   ulong dealTicket = trans.deal;
   if(!HistoryDealSelect(dealTicket))
      return;

   // DEAL_ENTRY_IN = this deal opened a position (we don't send yet —
   // wait for the matching exit deal, which has the final P&L numbers).
   // DEAL_ENTRY_OUT = this deal closed a position — this is what we want.
   long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   if(entry != DEAL_ENTRY_OUT)
      return;

   SendClosedTrade(dealTicket);
}

//+------------------------------------------------------------------+
//| Given the ticket of a CLOSING deal, find its matching opening     |
//| deal (same DEAL_POSITION_ID) and send the combined trade record.  |
//+------------------------------------------------------------------+
void SendClosedTrade(ulong closeDealTicket)
{
   long positionId = HistoryDealGetInteger(closeDealTicket, DEAL_POSITION_ID);

   // Pull the full deal history for this specific position so we can
   // find its opening deal alongside the closing one we already have.
   if(!HistorySelectByPosition(positionId))
   {
      Print("Could not select history for position ", positionId);
      return;
   }

   double openPrice = 0;
   datetime openTime = 0;
   bool foundOpen = false;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN)
      {
         openPrice = HistoryDealGetDouble(ticket, DEAL_PRICE);
         openTime  = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
         foundOpen = true;
         break;
      }
   }

   if(!foundOpen)
   {
      Print("Could not find opening deal for position ", positionId);
      return;
   }

   double closePrice = HistoryDealGetDouble(closeDealTicket, DEAL_PRICE);
   datetime closeTime = (datetime)HistoryDealGetInteger(closeDealTicket, DEAL_TIME);
   double profit     = HistoryDealGetDouble(closeDealTicket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(closeDealTicket, DEAL_COMMISSION);
   double swap       = HistoryDealGetDouble(closeDealTicket, DEAL_SWAP);
   double lots       = HistoryDealGetDouble(closeDealTicket, DEAL_VOLUME);
   string symbol     = HistoryDealGetString(closeDealTicket, DEAL_SYMBOL);

   // The CLOSING deal's type is the OPPOSITE of the position's direction
   // (you SELL to close a BUY position, and vice versa) — flip it back.
   long closeDealType = HistoryDealGetInteger(closeDealTicket, DEAL_TYPE);
   string tradeType = (closeDealType == DEAL_TYPE_SELL) ? "BUY" : "SELL";

   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string brokerName  = AccountInfoString(ACCOUNT_COMPANY);

   // Look up this position's tracked MAE/MFE, if we have it. Only
   // positions that were open WHILE this EA was running and ticking
   // get tracked — a trade backfilled via catch-up sync, or one that
   // was already open before this EA started, was never watched live,
   // so there's genuinely no MAE/MFE data for it. hasMaeMfe tells
   // SendTradeToApi whether to include those fields at all, rather
   // than sending a fake 0 that would misleadingly look like real data.
   int trackedIdx = FindTrackedIndex(positionId);
   bool hasMaeMfe = trackedIdx != -1;
   double mae = hasMaeMfe ? g_posMinProfit[trackedIdx] : 0;
   double mfe = hasMaeMfe ? g_posMaxProfit[trackedIdx] : 0;

   SendTradeToApi(
      positionId, accountNumber, brokerName, symbol, tradeType,
      lots, openPrice, closePrice, profit, commission, swap,
      openTime, closeTime, hasMaeMfe, mae, mfe
   );

   // Done with this position — stop tracking it so the arrays don't
   // grow forever over a long-running terminal session.
   if(hasMaeMfe)
      RemoveTrackedPosition(positionId);
}

//+------------------------------------------------------------------+
//| Convert MQL5 datetime to ISO 8601, the format JS's Date/Prisma    |
//| expects. Note: this is your broker's SERVER time, not true UTC —  |
//| fine for a personal journal, but be aware trades may appear a few |
//| hours off from your local wall-clock time depending on broker.   |
//+------------------------------------------------------------------+
string ToIso8601(datetime dt)
{
   MqlDateTime mdt;
   TimeToStruct(dt, mdt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                        mdt.year, mdt.mon, mdt.day, mdt.hour, mdt.min, mdt.sec);
}

//+------------------------------------------------------------------+
//| Build the JSON payload and POST it to /api/webhooks/trade.        |
//+------------------------------------------------------------------+
void SendTradeToApi(long ticketId, long accountNumber, string brokerName,
                     string symbol, string tradeType, double lots,
                     double openPrice, double closePrice, double profit,
                     double commission, double swap,
                     datetime openTime, datetime closeTime,
                     bool hasMaeMfe, double mae, double mfe)
{
   string maeMfeJson = "";
   if(hasMaeMfe)
   {
      // Only appended when we actually tracked this position live —
      // omitting the fields entirely (rather than sending 0) means
      // the backend can tell "genuinely no data" apart from "broke
      // even," which a 0 would hide.
      maeMfeJson = StringFormat(",\"mae\":%.2f,\"mfe\":%.2f", mae, mfe);
   }

   string json = StringFormat(
      "{\"ticketId\":%I64d,\"accountNumber\":%I64d,\"brokerName\":\"%s\"," \
      "\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f," \
      "\"openPrice\":%.5f,\"closePrice\":%.5f," \
      "\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f," \
      "\"openTime\":\"%s\",\"closeTime\":\"%s\"%s}",
      ticketId, accountNumber, brokerName,
      symbol, tradeType, lots,
      openPrice, closePrice,
      profit, commission, swap,
      ToIso8601(openTime), ToIso8601(closeTime),
      maeMfeJson
   );

   string headers = "Content-Type: application/json\r\n" +
                     "x-api-key: " + EaSecretKey + "\r\n";

   char postData[];
   StringToCharArray(json, postData, 0, StringLen(json));

   char result[];
   string resultHeaders;
   int timeout = 5000;

   int res = WebRequest("POST", ServerUrl, headers, timeout, postData, result, resultHeaders);

   if(res == -1)
   {
      Print("Failed to send trade ", ticketId, ". Error code: ", GetLastError());
      return;
   }

   Print("Sent trade ", ticketId, ". HTTP status: ", res, " Response: ", CharArrayToString(result));
}

//+------------------------------------------------------------------+
//| Minimal URL-encoder — just handles spaces, which is the only     |
//| character likely to show up in a broker name (e.g. "Exness       |
//| Technologies Ltd"). Not a general-purpose encoder.                |
//+------------------------------------------------------------------+
string UrlEncodeSpaces(string s)
{
   string result = s;
   StringReplace(result, " ", "%20");
   return result;
}

//+------------------------------------------------------------------+
//| Pulls a single string field out of a flat JSON object by naive   |
//| substring search. Fine for our fixed, known response shape —     |
//| not a general JSON parser. Returns "" if the field is missing    |
//| or explicitly null.                                               |
//+------------------------------------------------------------------+
string ExtractJsonStringField(string json, string field)
{
   string needle = "\"" + field + "\":\"";
   int start = StringFind(json, needle);
   if(start == -1)
      return ""; // field absent, or value was null (no opening quote)

   start += StringLen(needle);
   int end = StringFind(json, "\"", start);
   if(end == -1)
      return "";

   return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Reverse of ToIso8601 — parses "YYYY-MM-DDTHH:MM:SSZ" back into   |
//| an MQL5 datetime. StringToTime() expects MT5's native            |
//| "YYYY.MM.DD HH:MM:SS" format, so we convert the separators first. |
//+------------------------------------------------------------------+
datetime FromIso8601(string iso)
{
   string s = iso;
   StringReplace(s, "-", ".");
   StringReplace(s, "T", " ");
   StringReplace(s, "Z", "");
   return StringToTime(s);
}

//+------------------------------------------------------------------+
//| Ask the server for this account's last synced trade, then scan   |
//| local MT5 history from that point forward and send anything the  |
//| server doesn't have yet. Reuses SendClosedTrade — same logic     |
//| that handles live OnTradeTransaction events.                      |
//+------------------------------------------------------------------+
void CatchUpSync()
{
   long accountNumber = AccountInfoInteger(ACCOUNT_LOGIN);
   string brokerName  = AccountInfoString(ACCOUNT_COMPANY);

   string url = LastSyncUrl +
                "?accountNumber=" + IntegerToString(accountNumber) +
                "&brokerName=" + UrlEncodeSpaces(brokerName);

   string headers = "x-api-key: " + EaSecretKey + "\r\n";
   char postData[]; // empty — GET request, no body
   char result[];
   string resultHeaders;
   int timeout = 15000; // generous — Next.js dev mode can take several
                         // seconds to compile a route on its first hit

   int res = WebRequest("GET", url, headers, timeout, postData, result, resultHeaders);

   if(res == -1)
   {
      Print("Catch-up sync failed to reach server. Error code: ", GetLastError());
      return;
   }

   if(res != 200)
   {
      Print("Catch-up sync got unexpected HTTP status: ", res);
      return;
   }

   string responseBody = CharArrayToString(result);
   string lastCloseTimeStr = ExtractJsonStringField(responseBody, "lastCloseTime");

   datetime fromDate;
   if(lastCloseTimeStr == "")
   {
      // No prior sync at all for this account — pull full available
      // history. On an account with years of history this could be
      // a lot of trades sent at once; that's expected for a true
      // first-time sync, just slower than a normal catch-up.
      fromDate = D'1970.01.01 00:00:00';
      Print("No previous sync found for this account — backfilling full history.");
   }
   else
   {
      fromDate = FromIso8601(lastCloseTimeStr);
      Print("Last synced trade closed at ", lastCloseTimeStr, " — checking for anything newer.");
   }

   datetime toDate = TimeCurrent();

   if(!HistorySelect(fromDate, toDate))
   {
      Print("Could not select history range for catch-up sync.");
      return;
   }

   int total = HistoryDealsTotal();

   // Collect closing-deal tickets FIRST, in a separate pass, before
   // calling SendClosedTrade on any of them. SendClosedTrade calls
   // HistorySelectByPosition internally, which would silently change
   // what HistoryDealsTotal()/HistoryDealGetTicket() refer to out
   // from under this loop if we sent while still iterating.
   ulong closingTickets[];
   int closingCount = 0;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_OUT)
      {
         closingCount++;
         ArrayResize(closingTickets, closingCount);
         closingTickets[closingCount - 1] = ticket;
      }
   }

   // Now that the full list is captured, it's safe to call
   // SendClosedTrade for each — its internal HistorySelectByPosition
   // calls can't corrupt an iteration that's already finished.
   for(int j = 0; j < closingCount; j++)
   {
      SendClosedTrade(closingTickets[j]);
   }

   Print("Catch-up sync complete. Checked ", closingCount, " closed trade(s) in range.");
}
