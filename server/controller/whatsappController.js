const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const axios = require("axios");
const https = require("https");

const sendAbsentMessage = async (req, res) => {
  try {
    // Get current date in IST
    const today = new Date(); // Get the current date and time
    const indiaToday = new Date(today.getTime());
    
    // Format to YYYY-MM-DDT00:00:00.000+00:00
    const formattedDate = indiaToday.toISOString().split("T")[0] + "T00:00:00.000+00:00";
    
    // Find today's attendance record
    const attendanceRecord = await Attendance.findOne({ date: formattedDate });

    if (!attendanceRecord) {
      return res.status(404).json({
        message: "No attendance record found for today.",
      });
    }

    // Extract absentList for today
    const { absentList } = attendanceRecord;
    if (!absentList || absentList.length === 0) {
      return res.status(200).json({
        message: "No students in the absent list for today.",
      });
    }

    // Custom HTTPS agent to bypass SSL validation
    const agent = new https.Agent({ rejectUnauthorized: false });

    const failedMessages = [];

    // Get today's date in DD/MM/YYYY format
    const todayDate = indiaToday.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }).split(",")[0];
    const [day, month, year] = todayDate.split("/");
    const formattedTodayDate = `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;

    // Iterate through absent students and send messages
    for (const { barcode } of absentList) {
      try {
        // Fetch student by barcode
        const student = await Student.findOne({ barcode });
        if (!student) {
          throw new Error(`No student found with barcode: ${barcode}`);
        }

        const phoneNumber = student.contactNumber; // Primary contact number
        if (!phoneNumber) {
          throw new Error(`No contact number found for student with barcode: ${barcode}`);
        }

        const response = await axios.post(
          process.env.WHATSAPP_API_URL,
          {
            to: phoneNumber,
            recipient_type: "individual",
            type: "template",
            template: {
              name: "send_absent_message", // Template name
              language: {
                policy: "deterministic",
                code: "en", // Language code
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: student.name }, // Student name as a parameter
                    { type: "text", text: formattedTodayDate }, // Date as a parameter in DD/MM/YYYY format
                  ],
                },
              ],
            },
          },
          {
            httpsAgent: agent,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.WHATAPI_TOKEN}`,
            },
          }
        );

      } catch (error) {
        failedMessages.push({ barcode, error: error.response?.data || error.message });
      }
    }

    if (failedMessages.length > 0) {
      return res.status(500).json({
        message: "Some messages failed to send.",
        failedMessages,
      });
    }

    res.status(200).json({
      message: "WhatsApp messages sent successfully to all absent students.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to send WhatsApp messages.",
      error: error.message,
    });
  }
};

module.exports = { sendAbsentMessage };