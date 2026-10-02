# 🏥 MedTrail: Intelligent Medical Timeline & Safety Platform

Welcome to the **MedTrail** repository. MedTrail is an advanced, AI-powered health management platform that unifies patient medical records, provides an expert-level OCR prescription scanner, and actively monitors for dangerous drug-drug interactions.

---

## 🏗️ System Architecture

While MedTrail is built as a highly-efficient **Next.js Full-Stack Monolith** (allowing for zero-latency communication and easy deployment), the codebase is strictly organized into distinct, logical micro-modules.

If you are navigating the repository, please refer to this architectural map:

### 🖥️ 1. Frontend (UI / Portals)
The client-facing application is a responsive, single-page experience supporting distinct personas (Patients, Caregivers, Doctors).
*   **Location:** \src/app/\, \src/components/\, \src/features/\
*   **Tech:** React, Next.js 14, Tailwind CSS, Framer Motion
*   **Key Files:** \DashboardPage.tsx\, \CaptureModule.tsx\

### 🧠 2. OCR (Optical Character Recognition Engine)
Our "Expert Pharmacist" AI module. It securely processes prescription images, standardizes medication names, and extracts dosages, duration, and clinical advice into strict JSON format.
*   **Location:** \src/app/api/ocr/route.ts\
*   **Tech:** Gemini 2.5 Flash Vision Model
*   **Capabilities:** Multi-drug extraction, handwriting analysis, intelligent fallback storage.

### 💊 3. DD-Inter (Drug-Drug Interaction Engine)
The core safety mechanism of MedTrail. It cross-references patient prescriptions in real-time to detect contraindications and severe interaction warnings.
*   **Location:** \src/app/api/check-interaction/route.ts\ & \src/app/api/rxnorm/route.ts\
*   **Capabilities:** Automated interaction flagging, caregiver SOS alerts.

### ⚙️ 4. Backend (Core Services & Security)
The serverless infrastructure managing data persistence, user authentication, and strict medical data validation.
*   **Location:** \src/lib/firebase.ts\, \src/schemas/\
*   **Tech:** Firebase (Firestore / Auth), Next.js Serverless Functions
*   **Security:** DPDP Act (2023) compliant consent flows, strict E.164 phone number validation, secure Base64 image fallback protocols.

---

## ✨ Key Features

*   **Multi-Persona Dashboards:** Tailored views for Patients (Timeline), Caregivers (Monitoring), and Doctors (Clinical Review).
*   **Instant Prescription Digitization:** Upload a photo, and the AI extracts and organizes the data automatically.
*   **Strict Data Integrity:** Forms are locked down with strict regex (e.g., exact 10-digit phone numbers, dropdowns for blood types) to prevent vague or corrupt medical data.
*   **Emergency SOS:** One-click SOS alerts triggered via Twilio/WhatsApp for caregivers when critical interactions occur.

---

## 🚀 Getting Started

To run the MedTrail platform locally:

1. **Install Dependencies:**
   \\\ash
   npm install
   \\\

2. **Set Environment Variables:**
   Ensure you have a \.env.local\ file with your Firebase, Gemini, and Cloudinary API keys.

3. **Run the Development Server:**
   \\\ash
   npm run dev
   \\\
   
4. **Access the Application:**
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
*Maintained by UdayCreates / PoisonWorld*
