SAVE & EARN WITH PAUL - VERSION 6.3

THE CUSTOMER JOURNEY
Version 6.1 introduces one guided five-minute Household Check.

The visitor:
1. Chooses the main household goal.
2. Adds basic home information.
3. Uses the strongest available energy information.
4. Records broadband, mobile and insurance details and renewal dates.
5. Chooses whether optional earning is relevant.
6. Receives one clear household snapshot.

THE HOUSEHOLD SNAPSHOT
- Readiness percentage and plain-English status
- Services that may be worth discussing
- Missing details that would improve the conversation
- Energy source and confidence
- Contract and renewal timeline
- A short ordered next-action list
- Paul’s recommended next step
- One-page professional PDF
- Full household and Energy Data Passport summaries remain available

ENERGY DATA PASSPORT
The official EPC integration, annual-kWh entry, meter annualisation, public NEED benchmarks and transparent household estimate remain included.
See ENERGY_DATA_SETUP.txt for optional property-lookup configuration.

DEPLOYMENT
1. Extract the ZIP.
2. Upload every file and folder from the extracted package to the repository root.
3. Commit:
   Launch Version 6.3 Step 3 refinement
4. Keep the existing private EPC_API_TOKEN setting when official property lookup is enabled.
5. Deploy and test:
   /
   /command-centre
   /command-centre?view=result
   /household-os
   /calculator
   /report-studio?type=snapshot
   /privacy

DATA AND PRIVACY
Answers remain on the visitor’s device unless the visitor chooses to share them.
The readiness result is a planning aid, not a quotation, eligibility decision, credit assessment or guaranteed saving.


VERSION 6.3 REFINEMENT
- Rebuilt Step 3 energy-source selection as larger, overflow-safe cards.
- Added clearer language: annual kWh, meter readings, property context or household estimate.
- Added accuracy labels and improved mobile stacking.
- Added stronger selected-state visibility and keyboard focus.
- Hid unused annual-kWh fields when the estimate option is selected.


VERSION 6.3 VIDEO
The homepage includes the enhanced how-paul-can-help-v6.3.mp4 file and an interactive chapter guide. Upload the MP4, poster JPG and video-guide.v6.3.js with the rest of the site.
