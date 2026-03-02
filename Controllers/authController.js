import User from "../Models/User.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

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

export const forgotPassword = async (req,res) => {
    console.log("forgotPassword called with:", req.body);
    const {email} = req.body;
    
    console.log("Looking for user with email:", email);
    const user =await User.findOne({email});
    console.log("User found:", user ? "YES" : "NO");
    
    if(!user) return res.status(403).json({message: "User not  found"});

    const token = crypto.randomBytes(32).toString("hex");

    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,   // VERY IMPORTANT
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
        to: user.email,
        subject: "Password Reset",
        html: `<h3>Click below to reset password</h3>
        <a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({message: "Reset link sent to email"});
};

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