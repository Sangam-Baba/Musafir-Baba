import dotenv from "dotenv"
import connectDb from "./config/db.js"
import app from "./app.js"


const PORT=process.env.PORT || 5000
dotenv.config();

connectDb().then(()=>{
    console.log("Database connected");
})

app.get('/' ,(req,res)=>{
    res.send("Server is running...")
})

app.listen(PORT, ()=>{
      console.log(`Server running on port ${PORT}`);
})