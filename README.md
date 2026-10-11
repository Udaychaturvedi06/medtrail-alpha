# MedTrail

MedTrail is a comprehensive healthcare management and safety platform designed to bridge the communication gap between patients, caregivers, and medical professionals. By digitizing medical records and introducing proactive drug interaction checks, MedTrail aims to reduce medical errors and make longitudinal health data accessible.

## Project Overview

In traditional healthcare settings, patients often struggle to maintain a consolidated medical history, leading to fragmented care and an increased risk of adverse drug events (ADEs). MedTrail addresses this by providing a unified digital timeline for medical records, powered by optical character recognition (OCR) for easy prescription uploads, and an automated drug-drug interaction (DDInter) safety engine.

This project was developed as a comprehensive solution for modern healthcare tracking, focusing on data integrity, user accessibility, and proactive safety monitoring.

## Key Features

- **Multi-Role Portals:** Dedicated interfaces for Patients (to manage their timeline), Caregivers (to monitor dependents), and Doctors (to review clinical history).
- **Automated Prescription Digitization:** Users can upload images of handwritten prescriptions or medicine strips. The system extracts medication names, dosages, and durations, standardizing the data for the timeline.
- **Drug-Drug Interaction (DDInter) Engine:** Cross-references newly uploaded medications against a patient's existing active prescriptions to flag potential moderate or severe interactions (e.g., Warfarin and Aspirin).
- **Emergency SOS System:** Allows patients to instantly alert their designated caregiver via WhatsApp in case of a medical emergency.
- **Government Sync Integration:** Prepared infrastructure for Ayushman Bharat Health Account (ABHA) linking to synchronize lab reports from ABDM-compliant hospitals.

## Technical Architecture

MedTrail is built on a modern, serverless technology stack to ensure scalability and responsiveness.

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
- **Backend & Database:** Firebase Authentication, Firestore (NoSQL), Next.js API Routes
- **Data Processing:** Integration with the NIH RxNorm API for strict pharmaceutical standardization and Google Gemini Vision for OCR data extraction.
- **Notifications:** Twilio API for automated WhatsApp emergency routing.

## Repository Structure

- `src/app/`: Core Next.js routing, including dashboards, profile management, and serverless API endpoints.
- `src/components/`: Reusable UI elements and the Manual Interaction Checker.
- `src/features/`: Feature-specific modules, such as the `CaptureModule` for handling prescription uploads and OCR processing.
- `src/data/`: Local datasets, including the compiled dictionary for the interaction engine.
- `src/lib/`: Firebase configuration and utility functions.

## Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Udaychaturvedi06/medtrail-alpha.git
   cd medtrail
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Configuration:**
   Copy the sample environment file and configure your credentials:
   ```bash
   cp .env.example .env.local
   ```
   Provide your Firebase configuration, Gemini API key, and Twilio credentials.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` in your browser to view the application.

## Contributors

Developed by the MedTrail Team:
- **Uday Chaturvedi**
- **Rishi**
- **Shravani**
- **Abhi**

*VIT Bhopal University*
