import express from "express"
import cors from "cors"
import routes from "./routes/index.js"
//import errorHandler from "./middleware/errorHandler.js"



const app=express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({extended:true}));


app.use('/api', routes);

//app.use(errorHandler);

export default app