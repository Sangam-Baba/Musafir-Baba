import mongoose from "mongoose";


const visaSchema =new mongoose.Schema({
    country:{
        type:String,
        trim:true,
        required:true,
        unique:true
    },
    coverImage:{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    },
    duration:{
        type:String,
        trim:true
    },
    cost:{
        type:Number,
    },
    visaType:{
        type:String,
        enum:["E-Visa", "DAC", "EVOA"],
    },
    visaProcessed:{
        type:Number
    },
    isActive:{
        type:Boolean,
        default:true
    },
    childUrl:{
        type:String
    }
}, { timestamps: true });

export const Visa = mongoose.model("Visa", visaSchema);