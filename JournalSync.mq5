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

   SendTradeToApi(
      positionId, accountNumber, brokerName, symbol, tradeType,
      lots, openPrice, closePrice, profit, commission, swap,
      openTime, closeTime
   );
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
                     datetime openTime, datetime closeTime)
{
   string json = StringFormat(
      "{\"ticketId\":%I64d,\"accountNumber\":%I64d,\"brokerName\":\"%s\"," \
      "\"symbol\":\"%s\",\"type\":\"%s\",\"lots\":%.2f," \
      "\"openPrice\":%.5f,\"closePrice\":%.5f," \
      "\"profit\":%.2f,\"commission\":%.2f,\"swap\":%.2f," \
      "\"openTime\":\"%s\",\"closeTime\":\"%s\"}",
      ticketId, accountNumber, brokerName,
      symbol, tradeType, lots,
      openPrice, closePrice,
      profit, commission, swap,
      ToIso8601(openTime), ToIso8601(closeTime)
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
