import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

let otps = {}; // Store OTPs temporarily

export const sendOTP = async (req, res, next) => {
    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000);
    otps[email] = otp;

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    let mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.status(500).json({ message: 'Error sending email', error });
        }
        res.status(200).json({ message: 'OTP sent to email' });
    });
};

export const verifyOTP = (req, res, next) => {
    const { email, otp } = req.body;
    if (otps[email] && otps[email] == otp) {
        delete otps[email];
        next();
    } else {
        return res.status(401).json({ message: 'Invalid OTP' });
    }
};
