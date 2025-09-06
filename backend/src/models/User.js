import mongoose from "mongoose"

const UserSchema=new mongoose.Schema({
  name:{
    type:String,
    required:true
  },
  email:{
    type:String,
    required:true,
    unique:true
  },
  password:{
    type:String,
    required:true
  },
  role:{
    type:String,
    enum:["user", "admin"],
    default:"user",
  },
  isVerified:{
    type:Boolean,
    default:false,
  },
  avatar:{
    type:String,
  },
  refresh_token : {
    type : String,
    default : ""
  },
  otp:String,
  otpExpire:Date,
  resetPasswordToken:String,
  resetPasswordExpire:Date,
  lastLogin:Date,

}, {timestamps:true})

export const User= mongoose.model('User', UserSchema);