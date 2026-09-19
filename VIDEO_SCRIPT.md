# Video Presentation Script: PollPulse (3 to 5 Minutes)

Use this step-by-step presentation script to record your required submission video for the **GUVI Developer Internship**.

---

## ⏱️ Video Breakdown & Spoken Script

### 0:00 – 0:30 | Introduction
- **On-screen**: PollPulse Landing Page (`http://localhost:5173/`).
- **What to say**:
  > "Hello evaluators! My name is [Your Name], and this is PollPulse — a full-stack real-time live polling application developed for the GUVI Developer Internship.
  > The core goal of this project is to allow anyone to create an interactive poll, share a unique link, and have audience members vote with live vote counts updating across all screens instantaneously with zero page refreshes.
  > The tech stack utilizes React with modern CSS on the frontend, Go with Gin on the backend, MongoDB for persistent storage, and Redis driving both live vote counting and Pub/Sub event broadcasting."

---

### 0:30 – 1:00 | Authentication & Login
- **On-screen**: Navigate to `/login`. Click "Fill Demo Credentials" (or enter `alice@example.com` / `password123`) and click "Log In".
- **What to say**:
  > "Here is the authentication flow. Poll creation is protected by server-side JWT authentication. Passwords are never stored in plain text; they are hashed using Bcrypt. 
  > Upon logging in, our Go backend verifies the credentials and returns a secure JWT token, giving us access to the Creator Dashboard."

---

### 1:00 – 1:40 | Creating a Poll
- **On-screen**: On the Dashboard, click "Create Poll". Show the question and options input fields. Click "Load Example" or enter:
  - Question: *"What is your favorite programming language?"*
  - Options: *Python, JavaScript, Go, Java*
  - Expiration: *Never*
  Click **Publish & Generate Share Link**.
- **What to say**:
  > "Now, let's create a poll. The backend validates that the question is at least 5 characters long and contains between 2 and 10 distinct options. We can also configure expiration durations such as 1 hour, 1 day, or never.
  > When I click 'Publish', Go stores the poll in MongoDB and immediately initializes the option counters in Redis. We are now on the live results screen."

---

### 1:40 – 2:10 | Sharing the Poll
- **On-screen**: Show the generated 6-character Share Code (e.g. `XQKX8A`) and click **Copy Voting Link**. Show the toast notification.
- **What to say**:
  > "The application generates a clean, readable share code and a direct shareable link.
  > Notice the status pill indicating 'Live Stream Active (Redis Pub/Sub)'. This screen is connected directly via a WebSocket to our Go server, awaiting live audience votes."

---

### 2:10 – 3:00 | The Crucial Test: Multi-Browser Real-Time Voting (Zero Refresh)
- **On-screen**: Split your screen into two side-by-side windows:
  - **Left Window**: Creator Live Results (`/poll/.../results`)
  - **Right Window (Incognito)**: Audience Voting View (`/poll/XQKX8A`)
- **Action**: In the right window, select **"Go"** and click **"Submit Vote"**.
- **What to see**: Confetti pops on the voter window, and the left window's progress bar and vote count immediately jump to 1 with zero page refresh!
- **What to say**:
  > "Now for the most important requirement: real-time updates without refreshing.
  > On the right, I have opened an incognito window simulating an audience voter. On the left is our live results dashboard.
  > Watch what happens when I cast a vote for 'Go'.
  > Confetti fires on the voter screen, and immediately on the left screen, 'Go' updates to 1 vote and the progress bar grows without any page reload!
  > If I try to vote again from the same browser, the backend rejects it with a 409 Conflict, preventing vote manipulation."

---

### 3:00 – 3:40 | Explaining the Architecture
- **On-screen**: Show the Architecture Diagram in `README.md` or the terminal logs showing Redis Pub/Sub events.
- **What to say**:
  > "Let's review the architecture that makes this work:
  > 1. When an audience member votes, a `POST` request hits our Go/Gin server.
  > 2. The Go backend validates the input, ensures the poll is active, and persists the vote document in MongoDB.
  > 3. Concurrently, it invokes Redis `HINCRBY` to atomically increment the in-memory count.
  > 4. Redis then publishes a `VOTE_UPDATED` event to the Redis Pub/Sub channel.
  > 5. Our Go WebSocket Hub, which is subscribed to Redis, receives the event and broadcasts it to all connected browser WebSockets in that poll's room.
  > 6. React receives the message and triggers an instant state re-render."

---

### 3:40 – 4:20 | The Biggest Challenge & Solution
- **On-screen**: Highlight `backend/websocket/hub.go` or `backend/services/redis_service.go`.
- **What to say**:
  > "The biggest engineering challenge was managing WebSocket room lifecycles and preventing Redis Pub/Sub connection leaks. If a subscriber remained open for every poll indefinitely, memory would degrade rapidly.
  > To solve this, I designed an on-demand room manager. When the first client connects to a poll room, the Go hub dynamically launches a Redis subscriber goroutine with a cancellation context. When the last client disconnects, the context cancels and gracefully closes the Redis subscriber."

---

### 4:20 – 5:00 | AI Usage Reflection
- **On-screen**: Show code structure or `README.md` AI usage section.
- **What to say**:
  > "Finally, regarding AI usage: I used AI as an accelerator for drafting boilerplate Go routing, struct definitions, and designing the CSS tokens.
  > Where AI required course correction was ensuring Redis wasn't just a placeholder. Standard AI suggestions often fall back on native Go channels or polling; I made sure to implement genuine Redis `HINCRBY` counts and actual Redis Pub/Sub pipelines as mandated by the assignment.
  > Thank you for reviewing my project!"

---

## 💡 Pro-Tips for Recording
1. **Screen Resolution**: Set display to 1920x1080 for crisp video clarity.
2. **Audio**: Use a headset or clear microphone with low background noise.
3. **Recording Software**: Use OBS Studio, Loom, or Windows Game Bar (`Win + G`).
4. **Upload**: Upload to YouTube as **Unlisted** (or Google Drive with "Anyone with link can view") and copy the link for submission to `devhiring@hclguvi.com`.
