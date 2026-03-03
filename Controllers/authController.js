import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from 'nodemailer';


export const register = async (req,res) => {
    const {name, email, password} = req.body;

    const hashed = await bcrypt.hash(password, 10);
    await User.create({name, email, password: hashed});

    res.json({message: "User Registered"});
};

export const login = async (req,res) => {
    const {email, password} = req.body;
    
    console.log("Login attempt for email:", email);
    
    const user = await User.findOne({email});
    console.log("User found:", user ? "YES" : "NO");
    
    if(!user) return res.status(400).json({message: "Invalid Email"});

    console.log("Comparing password...");
    const match = await bcrypt.compare(password, user.password);
    console.log("Password match:", match ? "YES" : "NO");
    
    if(!match) return res.status(400).json({message: "Invalid Password"});

    res.json({message: "Login Successful"});
};

export const forgotPassword = async (req, res) => {
  try {
    console.log("forgotPassword called with:", req.body);
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(403).json({ message: "User not found" });
    console.log("user",user);
    
    const token = crypto.randomBytes(32).toString("hex");
    console.log("token",token);
    
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

  
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      family: 4,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    console.log("resetLink",resetLink);


    const trans = await transporter.sendMail({
      from: process.env.EMAIL, 
      to: user.email,
      subject: "Password Reset",
      html: `<h3>Click below to reset password</h3>
             <a href="${resetLink}">${resetLink}</a>`,
    });
    console.log("trans",trans);
    
    res.json({ message: "Reset link sent to email" });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Failed to send reset instructions" });
  }
};

// export const forgotPassword = async (req, res) => {
//   try {
//     console.log("===== FORGOT PASSWORD START =====");
//     console.log("Request body:", req.body);

//     const { email } = req.body;
//     console.log("Searching user with email:", email);

//     const user = await User.findOne({ email });

//     if (!user) {
//       console.log("User NOT found in DB");
//       return res.status(403).json({ message: "User not found" });
//     }

//     console.log("User found:", user.email);

//     // Generate token
//     const token = crypto.randomBytes(32).toString("hex");
//     console.log("Generated reset token:", token);

//     user.resetToken = token;
//     user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
//     await user.save();

//     console.log("Token saved in DB");
//     console.log("Token expiry time:", user.resetTokenExpiry);

//     // Initialize Resend
//     console.log("Initializing Resend...");
//     const resend = new Resend(process.env.RESEND_API_KEY);

//     if (!process.env.RESEND_API_KEY) {
//       console.log("❌ RESEND_API_KEY is missing in .env");
//     } else {
//       console.log("✅ RESEND_API_KEY loaded");
//     }

//     const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
//     console.log("Reset link generated:", resetLink);

//     console.log("Sending email now...");

//     const emailResponse = await resend.emails.send({
//       from: "onboarding@resend.dev",
//       to: user.email,
//       subject: "Password Reset",
//       html: `
//         <h3>Click below to reset password</h3>
//         <a href="${resetLink}">${resetLink}</a>
//       `,
//     });

//     console.log("✅ Email sent successfully");
//     console.log("Resend response:", emailResponse);

//     console.log("===== FORGOT PASSWORD END =====");

//     res.json({ message: "Reset link sent to email" });

//   } catch (error) {
//     console.log("===== FORGOT PASSWORD ERROR =====");
//     console.error("Error message:", error.message);
//     console.error("Full error:", error);
//     res.status(500).json({ message: "Failed to send reset instructions" });
//   }
// };

export const resetPassword = async(req, res) => {
    const {token} = req.body;
    const {newPassword} = req.body;
    
    console.log("Reset password attempt with token:", token);
    console.log("Current time:", Date.now());

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpiry: {$gt: Date.now()},
    });
    
    console.log("User found with valid token:", user ? "YES" : "NO");

    if(!user)
        return res.status(400).json({message: "Invalid or Expired Token"});

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;

    await user.save();

    res.json({message: "Password Reset Successfully"});
};