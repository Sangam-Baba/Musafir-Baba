import mongoose from "mongoose";
import slugify from "slugify";

const newsSchema= new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true,
        maxlength:[600, "Title must be less then 600 characters"],
    },
    slug:{
        type:String,
        unique:true,
        index:true,
    },
    content:{
        type:String,
        required:true,
    },
    excerpt:{
        type:String,
        maxlength:3000,
    },
    coverImage:{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    },
    gallery:[{
        url:String,
        alt:String,
        public_id:String,
        width:Number,
        height:Number
    }],
    author:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Author",
    },
    tags:[String],
    metaTitle:{
        type:String,
        maxlength:400
    },
    metaDescription:{
        type:String,
        maxlength:600,
    },
    keywords: [
      {
        type: String,
      },
    ],
    canonicalUrl: {
      type: String,
    },
    schemaType: {
      type: String,
    },
    status:{
        type:String,
        enum:["draft", "published", "archived"],
        default:"draft",
    },
    views:{
        type:Number,
        default:0,
    },
    likes:{
       type:Number,
       default:0
    },
    comments:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Comment",
        }
    ]
}, {timestamps:true});

newsSchema.pre("save", function(next){
    if(this.isModified('slug')){
        this.slug=slugify(this.slug, {lower:true, strict:true});
    }
    next();
})

newsSchema.pre("findOneAndUpdate", function(next){
  const update = this.getUpdate()
  if (update.slug) {
    update.slug = slugify(update.slug || update.title, { lower: true, strict: true })
    this.setUpdate(update)
  }
  next()
})

newsSchema.index({ title: "text", content: "text" }); // full-text
newsSchema.index({ tags: 1 }); // fast filtering

export const News=mongoose.model("News", newsSchema);