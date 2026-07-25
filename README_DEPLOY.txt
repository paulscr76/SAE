SAVE & EARN WITH PAUL - VERSION 6.0

CUSTOMER PROPOSITION
Help households explore simpler bills and potential savings by bringing eligible services together:
one bill, one app and one payment. The optional Partner opportunity is presented separately and income is not guaranteed.

MAJOR VERSION 6 FEATURE
ENERGY DATA PASSPORT

The Energy Data Passport clearly separates:
A - Customer-supplied annual usage
B - Meter-reading annualisation
C - Official EPC-informed property model
D - Transparent household estimate

It also displays current national domestic medians and quartiles from the NEED 2026 release, using 2024 consumption.

LIVE PROPERTY LOOKUP
The deployment includes protected API functions in the /api folder.
Official EPC lookup activates only after the private EPC_API_TOKEN environment variable is configured.
See ENERGY_DATA_SETUP.txt.

DEPLOYMENT
1. Extract the ZIP.
2. Upload all files and folders, including /api and /data, to the repository root.
3. Commit:
   Launch Version 6.0 Energy Data Passport
4. Configure EPC_API_TOKEN in the hosting project's private environment settings.
5. Redeploy.
6. Test:
   /
   /calculator
   /api/epc-status
   /command-centre
   /household-os
   /report-studio?type=energy
   /privacy

PROFESSIONAL OUTPUT
Print actions create branded A4 summaries. No customer-facing report is downloaded as a plain-text file.

PRIVACY
Postcodes are sent to the official property-data service only when the visitor actively searches and confirms the search.
Annual kWh, readings and estimates remain in the browser unless the visitor chooses to save or share them.
