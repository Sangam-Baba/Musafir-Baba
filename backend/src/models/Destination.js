import mongoose from "mongoose";
import slugify from "slugify";

const destinationSchema= new mongoose.Schema({
   name: {type: String, required:true, trime: true, unique: true},
   country:{ type:String, required:true},
   state:{ type:String},
   city:{ type:String},
    description: { type: String },
    coverImage: { type: String, required: true },
    gallery: [String],

    bestTimeToVisit: String,
    popularAttractions: [String],
    thingsToDo: [String],

    slug: { type: String, unique: true, index: true },

    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String], 
    },
}, { timestamps:true});

destinationSchema.pre('save', function(next){
    if(this.isModified("name")){
        this.slug=slugify(this.name, {lower:true , strict: true});
    }
    next();
})

export const Destination=mongoose.model("Destination", destinationSchema);