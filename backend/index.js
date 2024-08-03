
import express from 'express'
import cors from 'cors'
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv'
import useragent from 'express-useragent';
import bodyParser from 'body-parser';
import stripePackage from 'stripe';
import nodemailer from 'nodemailer';
import { UAParser } from 'ua-parser-js';

dotenv.config(); // important step to work with .env file

const app = express();
const port = process.env.PORT || 5000;
const stripe = stripePackage(process.env.STRIPE_SECRET_KEY);

// app.use(cors());
app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from this origin
  methods: 'GET,POST,PATCH,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization'
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(useragent.express());



// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendInvoiceEmail = (customerEmail, planDetails) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: customerEmail,
    subject: 'Subscription Plan Details',
    text: `Thank you for subscribing to our ${planDetails} plan. Here are your plan details...`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
    const postCollection = client.db('database').collection('posts'); // this is post collection
    const userCollection = client.db('database').collection('users'); // this is user collection
    // const videoCollection = client.db('database').collection('videos');  // this is video collection

    // Routes

    // Get post
    app.get('/post', async (req, res) => {
      const post = (await postCollection.find().toArray()).reverse();
      res.send(post);
    });

    // Get user
    app.get('/user', async (req, res) => {
      const user = await userCollection.find().toArray();
      res.send(user);
    });

    // Get video
    app.get('/video', async (req, res) => {
      const video = (await videoCollection.find().toArray()).reverse();
      res.send(video);
    });

    // Get loggedIn user
    app.get('/loggedInUser', async (req, res) => {
      const email = req.query.email;
      const user = await userCollection.find({ email: email }).toArray();
      res.send(user);
    });

    // Get user posts
    app.get('/userPost', async (req, res) => {
      const email = req.query.email;
      const post = (await postCollection.find({ email: email }).toArray()).reverse();
      res.send(post);
    });

    // // Get user videos
    // app.get('/userVideo', async (req, res) => {
    //   const email = req.query.email;
    //   const video = (await videoCollection.find({ email: email }).toArray()).reverse();
    //   res.send(video);
    // });

    // Store post
    app.post('/post', async (req, res) => {
      const post = req.body;
      const result = await postCollection.insertOne(post);
      res.send(result);
    });

    // Store user
    app.post('/register', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // // Store video
    // app.post('/video', async (req, res) => {
    //   const video = req.body;
    //   const result = await videoCollection.insertOne(video);
    //   res.send(result);
    // });



    // Custom function to detect Windows 11
    function detectWindows11(userAgent) {
      return /Windows NT 10\.0/.test(userAgent) && /Win64/.test(userAgent);
    }

    app.post('/log-login', (req, res) => {
      // Extract user agent and IP address
      const ua = req.headers['user-agent'];
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // Parse user agent
      const parser = new UAParser(ua);
      const parsedUA = parser.getResult();

      // Override OS name and version if it's Windows 11
      let osName = parsedUA.os.name;
      let osVersion = parsedUA.os.version;
      if (detectWindows11(ua)) {
        osName = 'Windows 11';
        osVersion = '11.0'; // Assuming the major version number for Windows 11
      }

      // Extract relevant information
      const loginInfo = {
        browser: parsedUA.browser.name,
        version: parsedUA.browser.version,
        os: osName + ' ' + osVersion,
        device: parsedUA.device.type || 'Desktop',
        ip: ipAddress,
      };

      // Log login information for debugging
      console.log('User login info:', loginInfo);

      // Respond with login information
      res.json(loginInfo);
    });

    // Update user
    app.patch('/userUpdates/:email', async (req, res) => {
      const filter = { email: req.params.email };
      const profile = req.body;
      const options = { upsert: true };
      const updateDoc = { $set: profile };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Stripe checkout session
    app.post('/create-checkout-session', async (req, res) => {
      const { plan, email } = req.body;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: email,
        line_items: [
          {
            price: plan, // Plan ID from Stripe Dashboard
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
      });

      // Send email after successful checkout session creation
      sendInvoiceEmail(email, plan);

      res.json({ id: session.id });
    });

    // Check subscription status
    app.get('/check-subscription', async (req, res) => {
      const { uid } = req.query;
      // Check the subscription status from your database
      const isSubscribed = true; // Replace with actual check

      res.json({ isSubscribed });
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    // Ensures that the client will close when you finish/error
    console.log(error);
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
