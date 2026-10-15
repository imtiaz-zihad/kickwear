// src/services/smsService.js
const axios = require("axios");

const sendSMS = async (phone, message) => {
  try {
    const formattedPhone = phone.startsWith("88") ? phone : `88${phone}`;

    // ✅ Must use encodeURIComponent for Bangla text
    const encodedMessage = encodeURIComponent(message);

    const url = `http://bulksmsbd.net/api/smsapi?api_key=${process.env.BULKSMS_API_KEY}&type=text&number=${formattedPhone}&senderid=${process.env.BULKSMS_SENDER_ID}&message=${encodedMessage}`;


    const response = await axios.get(url);
    //console.log("✅ SMS response:", response.data);
    return response.data;
  } catch (err) {
    console.error("❌ SMS error:", err?.response?.data || err.message);
  }
};

const SMS_MESSAGES = {
  Confirmed: (name, total, phone) =>
    `প্রিয় ${name},\n\nআপনার ${total} টাকার অর্ডারটি নিশ্চিত হয়েছে। শীঘ্রই ডেলিভারি দেওয়া হবে।\n\nঅর্ডার ট্র্যাক করুন:\nhttps://www.sbcollectionbd.com/track-order \n\nধন্যবাদ\nSB Collection BD`,
};

module.exports = { sendSMS, SMS_MESSAGES };
