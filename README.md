
Unloading-Earthmovers — Complete System Explanation

Unloadin Earthmovers is a fleet-enabled service platform that provides earthmoving machinery to customers on demand.
Unlike a marketplace model, Unloadin directly manages the service. Vehicles may either be owned by Unloadin or rented from external vendors, but all customer interaction, pricing, and fulfillment are handled by the platform.
Drivers operate the machines and execute the work while the platform manages booking, tracking, billing, and customer experience.
Customers interact with the system through WhatsApp AI, while drivers use a driver application to manage job execution

The platform handles:
 Booking requests
 Fleet allocation
 Driver dispatch
 GPS tracking
 Work-hour tracking
 Billing and payments
 Service quality monitoring


CUSTOMER SIDE — COMPLETE FLOW
STEP 1 — User Initiates Conversation
When a user sends a message, the system checks whether the phone number already exists. 
If not, a new user is created and a conversation session begins.
Stored information:
Phone number
User name
 Session start time
 Communication channel (WhatsApp)
 Session status

STEP 2 — Language Detection
The system detects language from the user's first message. 
That language becomes the default conversation language unless the user requests a change.
Stored information:
 Preferred language
Session language

STEP 3 — Location Collection
The bot asks: “Where do you need the earthmover?”
Users provides:
 City
 Village
 Pincode
 Shared WhatsApp location
The system maps the location to a service region in the database.

STEP 4 — Task Identification
The bot asks: “What type of work do you need?”
Examples include:
 Land leveling
 Excavation
 Trenching
 Demolition
The user may either type freely (AI classifies the task) or select from suggested options.

STEP 5 — Vehicle Recommendation
Now the system knows:
Region
 Task type
The system retrieves suitable vehicles for the task and shows starting price estimates.
Example message:
For your work, you may need:
JCB — Starting from ₹2500  
Truck — Starting from ₹4000  
Bulldozer — Starting from ₹6000  
Customers may request one or multiple machines.

STEP 6 — Booking Creation
When the customer selects the vehicle(s), a booking is created.
Status: WAITING_FOR_DISPATCH
The operations system then assigns a vehicle and driver.

STEP 7 — Driver Dispatch
Once a vehicle and driver are assigned, the customer receives confirmation with masked driver details and vehicle information.

DRIVER SIDE — COMPLETE FLOW
STEP 1 — Job Assignment
Drivers receive job information in their app including:
Customer location
 Assigned vehicle
Navigation route
 Scheduled booking time
The driver prepares the vehicle and begins the trip.

STEP 2 — Driver En Route
Driver presses Start Trip.
The system:
 Activates GPS tracking
 Sends notification to the customer
Customer receives message:
“Your Unloadin vehicle is on the way.”
The vehicle can be tracked like Swiggy or Instamart deliveries.

STEP 3 — Arrival Confirmation
When the driver reaches the site, the system detects arrival.
Customer receives a message:
“Your Unloadin vehicle has arrived.”
Customer confirms arrival.
Only after confirmation does the work timer start.

STEP 4 — Work Tracking
The system tracks:
Job start time
Total work duration
The timer continues until the driver marks the job as completed.

STEP 5 — Extension Handling
If additional time is required beyond the booked duration:
Either the customer may request additional hours, or the driver may request an extension with a reason.
The platform notifies the customer.
If the customer approves, the timer continues and additional hours are recorded.

STEP 6 — Job Completion
When work finishes, the driver presses Work Done.
The system records:
Job end time
 Total working hours
Example:
Start: 10:00 AM
End: 2:30 PM
Total: 4.5 hours

STEP 7 — Billing
The platform calculates the final bill using:
Hourly rate
Total hours worked
Example:
Hourly rate: ₹1500
Total hours: 4.5
Total amount: ₹6750
Customer receives:
Work summary
 Price breakdown
 Payment link


STEP 8 — Payment and Feedback
Customer completes payment.
After payment:
Job status becomes completed
 Customer provides feedback
The driver receives confirmation that the job is closed.

STEP 9 — Issue Handling
If any disputes or problems occur during the job, they are handled manually by the operations team.

Tech Stack is FAST API for backend and a very minimal react frontend 

