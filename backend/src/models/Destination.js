import mongoose from "mongoose";
import slugify from "slugify";

const destinationSchema= new mongoose.Schema({
   name: {type: String, required:true, trime: true, unique: true},
   country:{ type:String, required:true},
   state:{ type:String},
   city:{ type:String},
    description: { type: String },
    coverImage: { 
        alt: String,
        url: String,
        public_id: String,
        hight: Number,
        width: Number
     },
    gallery: [
        {
            alt: String,
            url: String,
            public_id: String,
            hight: Number,
            width: Number
        }
    ],

    bestTimeToVisit: String,
    popularAttractions: [String],
    thingsToDo: [String],

    slug: { type: String, unique: true, index: true },

    
      metaTitle: String,
      metaDescription: String,
      keywords: [String], 
      canonicalUrl: String,
      schemaType: String,
      status: { type: String, enum: ["draft", "published"], default: "draft" },
}, { timestamps:true});

destinationSchema.pre('save', function(next){
    if(this.isModified("name")){
        this.slug=slugify(this.name, {lower:true , strict: true});
    }
    next();
})

export const Destination=mongoose.model("Destination", destinationSchema);