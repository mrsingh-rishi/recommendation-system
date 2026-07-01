Project Overview

So we have an Internal platform for the operational team where the operational team will be able to choose vendor and that system will recommend the vendor based on the work requirement and vendor details.

Rather than manually reviewing spreadsheets and compliance documents, the platform should
assist users in maintaining vendor information and recommending the most suitable vendors
based on business rules.


DB schema's

vendor:- 
Name
Vendor Type
Category
Contact Details
Operating Location
Rating -- this should be stored in different schema.
Current Status

Vendor Documents:-
Tax Registration
Insurance
Trade License
Safety Certificate
Agreement

Work Requirements:-
Title
Category
Location
Estimated Value
Priority
Expected Start Date

Vendor Ratings:-
vendorId
Rating Value
workRequirementId
workRequirementTitle
workRequirementCategory
notes

Vendor Ranks:-
vendorId
rankValue
category


so the recommendation system will work like this:
1. When a work requirement is created, the system will analyze the work requirement details such as category, location, estimated value, and priority.
2. The system will then compare these details with the vendor information stored in the database, including vendor type, category, operating location, and rating.
3. Based on the comparison, the system will generate a list of recommended vendors that best match the work requirement criteria.

so before this, we are gonna mentain the vendor ratings in the different categories based on the work requirements and vendor performance. The ratings will be stored in the Vendor Ratings schema, which will include the vendor ID, rating value, work requirement ID, work requirement title, work requirement category, and any additional notes.

so when ever a new vendor rating is generated we are gonna do one thing we are gonna create the vendor rank on that category based on the rating value and store it in the Vendor Ranks schema, which will include the vendor ID, rank value, and category.

who ever have the highest rank in that category will be recommended first when a work requirement is created in that category. The recommendation system will prioritize vendors with higher ranks and better ratings, ensuring that the operational team receives the most suitable vendor recommendations for their work requirements.

so for the AI assisted feature we are gonna create the summary of the vendor recommendation based on the work requirement and vendor details. The AI-assisted feature will analyze the work requirement details, vendor information, and ratings to generate a comprehensive summary that highlights the most suitable vendors for the operational team to consider.

AI-Assisted Feature
Implement one intelligent capability.
Examples:
AI-generated recommendation summary
Vendor risk summary
Compliance observations
Vendor comparison summary



Important part is the Vendor Recommendation System.

API's should be like this.

/vendors:-
GET /vendors - Get all vendors
POST / vendors - create vendor
GET /vendors/{id} - Get Vendor by ID
PUT /vendors/{id} - update vendor by ID
DELETE /vendors/{id} - delete vendor by ID

/vendor-documents:-
GET /vendor-documents - Get all vendor documents
POST /vendor-documents - create vendor document
GET /vendor-documents/{id} - Get vendor document by ID
PUT /vendor-documents/{id} - update vendor document by ID
DELETE /vendor-documents/{id} - delete vendor document by ID

/work-requirements:-
GET /work-requirements - Get all work requirements
POST /work-requirements - create work requirement
GET /work-requirements/{id} - Get work requirement by ID
PUT /work-requirements/{id} - update work requirement by ID
DELETE /work-requirements/{id} - delete work requirement by ID

/recommendations:-
GET /recommendations?workRequirementId={id} - This endpoint will take a work requirement
ID as a query parameter and return a list of recommended vendors based on the work requirement details and vendor information.
