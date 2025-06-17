if(process.env.NODE_ENV != "production") {
require('dotenv').config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema } = require("./schema.js");
const Review = require("./models/review.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL; 
main()
  .then(() => {
    console.log("connection established");
  })
  .catch((err) => console.log("MAIN line number 19", err));
async function main() {
  await mongoose.connect(dbUrl);
}

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create( {
  mongoUrl:dbUrl, 
  crypto:{
    secret : process.env.SECRET,
  },
  touchAfter : 24 * 3600,
 })

 store.on( "err", () => {
     console.log("ERROR IN MONGODB STORE");
 })

const sessionOptions = {
  store,
  secret : process.env.SECRET,
  resave : false,
  saveUninitialized : true,
  cookie : {
    expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge:  7 * 24 * 60 * 60 * 1000,
    httpOnly : true,
  },
};

// app.get("/",(req,res)=> {
//   res.send("hi , i am root ");
// });



app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next)=> {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next(); // if next is not used we just stuck at this middleware..
});

// app.get("/demouser", async (req , res)=> {
//   let fakeUser = new User({
//     email : "student@gmail.com",
//     username : "delta-student"
//   });
//  let registeredUser = await User.register(fakeUser,"helloworld");
//  res.send(registeredUser);
// })

app.get('/search',async (req, res) => {
  const location = req.query.location; // Get the 'location' parameter from the query string
  const searchedListings = await Listing.find({location : location});
  res.render("listings/search.ejs", { searchedListings });
});

app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);


  

// app.get("/testListing",async (req,res)=> {
//     let sampleListing = new Listing({
//         title:"My New Villa",
//         description:"By the beach",
//         price:1200,
//         location:"Calangute,Goa",
//         country:"India",
//     });
//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// });


// middleware
app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "something went wrong" } = err;
  res.render("error.ejs", { message });
});


app.listen(8080,()=> {
    console.log("server is listening to port 8080");
});