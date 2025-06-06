const express = require('express');
const app = express();
const { Pool } = require('pg');
//const { Resend } = require('resend');
const port = 8080;

const env = require("./env.json");
const crypto = require('crypto');

const cors = require('cors');
const { get } = require('http');
const corsOptions = {
  origin: ["http://localhost:5173"],
};

app.use(cors(corsOptions));
app.use(express.json());

const pool = new Pool(env);
pool.connect().then(function () {
  console.log(`Connected to database ${env.database}`);
});

app.use((req, res, next) => {
  console.log(`Request URL: ${req.url}`);
  next();
});

//api entry point

app.get("/api", (req, res) => {
  res.json({ fruits: ["apple", "banana", "orange"] })
});


// need to check database to see if user exists and password is correct
app.post("/api-login", (req, res) => {
  const { username, password } = req.body;
  console.log("Received user data:", { username, password });

  // Simple check
  if (!username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const text = "SELECT * FROM users WHERE username = $1 AND password_hash = $2";
  const params = [username, password];

  console.log("Executing query:", text, params);

  pool.query(text, params)
    .then(result => {
      if (result.rows.length > 0) {
        console.log("User found:", result.rows[0]);
        res.status(200).json({ response: ["ok"] });
      } else {
        console.log("User not found");
        res.status(401).json({ error: "Invalid username or password" });
      }
    })
    .catch(err => {
      console.error("Error executing query", err.stack);
      res.status(500).json({ error: "Internal server error" });
    });

});

app.post("/api-create", async (req, res) => {
  const { email, username, password } = req.body;
  console.log("----- create ===== Received user data:", { email, username, password });

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const check = "SELECT 1 FROM users WHERE username = $1";
    const checkParams = [username];
    const checkResult = await pool.query(check, checkParams);

    if (checkResult.rowCount !== 0) {
      console.log("user already exists");
      return res.status(500).json({ error: "User already exists" });
    }

    const text = "INSERT INTO users (email, username, password_hash, user_role) VALUES ($1, $2, $3, 'user') RETURNING user_id";
    const params = [email, username, password];
    const result = await pool.query(text, params);

    const user_id = result.rows[0].user_id;
    const sampleBio = "This is a sample bio. Please update your profile with your own information.";
    const sampleProfilePic = "wine1.jpg"; // Replace with a real URL
    const sampleBackgPic = "bg3.jpg"; // Replace with a real URL
    
    const insertProfile = `INSERT INTO profile (user_id, bio, profile_pic, backg_pic) VALUES ($1, $2, $3, $4)`;
    const profileParams = [user_id, sampleBio, sampleProfilePic, sampleBackgPic];

    const profileResult = await pool.query(insertProfile, profileParams);
    if (profileResult.rowCount === 0) {
      console.log("Profile creation failed");
      return res.status(500).json({ error: "Profile creation failed" });
    }
    console.log("Profile created successfully for user_id:", user_id);
    console.log("User created successfully:", result.rows[0]);
    res.status(200).json({ response: ["ok"] });

  } catch (err) {
    console.error("Error executing query", err.stack);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api-wine-list", (req, res) => {
  let queryVal = `
    SELECT *
    FROM wine
    WHERE rating IS NOT NULL
    ORDER BY rating DESC
    LIMIT 10;
  `;

  pool.query(queryVal)
    .then(result => {
      res.status(200).json({ wines: result.rows });
    })
    .catch(err => {
      console.error("Error executing query", err.stack);
      res.status(500).json({ error: "Internal server error" });
    });
});


//get user cellar
app.get("/api/cellar/:username", async (req, res) => {
  const username = req.params.username;

   try {
    const user_id = await getUserId(username);
    if (!user_id) {
      return res.status(404).json({ error: "User not found" });
    }

    const cellarQuery = `
    SELECT 
      wine.name, 
      wine.grape, 
      vineyard.region, 
      rating.description AS review, 
      COALESCE(rating.value, 0) AS rating, 
      wine.year
    FROM cellar
    JOIN wine ON wine.wine_id = cellar.wine_id
    JOIN vineyard ON wine.vineyard_id = vineyard.vineyard_id
    LEFT JOIN rating ON rating.user_id = cellar.user_id AND rating.wine_id = cellar.wine_id
    WHERE cellar.user_id = $1
  `;


    const response = await pool.query(cellarQuery, [user_id]);
    if (response.rows.length === 0) {
      return res.status(200).json({ message: "Cellar is empty", cellar: [] });
    }
    res.status(200).json({ cellar: response.rows });


  } catch (err) {
    console.error("Error fetching user_id:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

});

//removing wine from cellar
app.delete("/api/cellar/remove/:username/:winename", async (req, res) => {
  const { username, winename } = req.params;
  console.log("Removing wine from cellar:", { username, winename });

  

  try {
    const user_id = await getUserId(username);
    if (!user_id) {
      console.log("User not found:", username);
      return res.status(404).json({ error: "User not found" });
    }

    const wine_id = await getWineId(winename);
    if (!wine_id) {
      console.log("Wine not found:", winename);
      return res.status(404).json({ error: "Wine not found" });
    }

    const query = `DELETE FROM cellar WHERE user_id = $1 AND wine_id = $2`;
    const response = await pool.query(query, [user_id, wine_id]);
    console.log("Delete response:", response);

    if (response.rowCount === 0) {
      return res.status(404).json({ error: "No matching entry found." });
    }

    const deleteRatingQuery = `
      DELETE FROM rating
      WHERE user_id = $1 AND wine_id = $2
    `;
    const ratingResponse = await pool.query(deleteRatingQuery, [user_id, wine_id]);
    console.log("Wine removed from cellar:", { username, winename });

     if (ratingResponse.rowCount === 0) {
      return res.status(404).json({ error: "No matching entry found." });
    }

    return res.status(200).json({ message: "Wine removed from cellar." });
  } catch (err) {
    console.error("Error removing wine from cellar:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


//update wine rating
app.put("/api/cellar/update", async (req, res) => {
  const { username, wineName, newReview, newRating } = req.body;

  try {
    const user_id = await getUserId(username);
    const wine_id = await getWineId(wineName);

    if (!user_id || !wine_id) {
      return res.status(404).json({ error: "User or wine not found" });
    }

    const query = `
      UPDATE rating
      SET description = $1, value = $2
      WHERE user_id = $3 AND wine_id = $4
    `;

    await pool.query(query, [newReview, newRating, user_id, wine_id]);

    res.status(200).json({ message: "Wine updated successfully" });
  } catch (err) {
    console.error("Error updating wine:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get('/api/profile/:username', async (req, res) => {
  const username = req.params.username;
  console.log("Requested profile for:", username);

  try {
    const user_id = await getUserId(username);

    if (!user_id) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await pool.query(
      `SELECT bio, profile_pic, backg_pic FROM profile WHERE user_id = $1`,
      [user_id]
    );

    const profile = result.rows[0];

    if (!profile) {
      // Return empty/default profile if entry doesn't exist
      return res.json({ bio: "", profile_pic: "", backg_pic: "" });
    }

    res.json(profile);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.put("/api/profile/:username", async (req, res) => {
  const username = req.params.username;
  const { bio, profile_pic, backg_pic } = req.body;

  try {
    const user_id = await getUserId(username);

    if (!user_id) {
      return res.status(404).json({ error: "User not found" });
    }

    await pool.query(
      `
      UPDATE profile
      SET bio = $1, profile_pic = $2, backg_pic = $3
      WHERE user_id = $4
    `,
      [bio, profile_pic, backg_pic, user_id]
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get food pairings for a wine
app.get("/api/food-pairings/:wine_id", async (req, res) => {
  const { wine_id } = req.params;
  try {
    const query = `
      SELECT *
      FROM food_pairing
      WHERE wine_id = $1
    `;
    const result = await pool.query(query, [wine_id]);
    // Return as array of strings
    const pairings = result.rows.map(row => row.name);
    res.status(200).json({ pairings });
  } catch (err) {
    console.error("Error fetching food pairings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get vineyard info by vineyard_id
app.get("/api/vineyard/:vineyard_id", async (req, res) => {
  const { vineyard_id } = req.params;
  console.log("vineyard_id", vineyard_id);
  try {
    const query = `
      SELECT *
      FROM vineyard
      WHERE vineyard_id = $1
    `;
    const result = await pool.query(query, [vineyard_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Vineyard not found" });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching vineyard info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api-add-to-cellar", async (req, res) => {
  const { username, wine_id, rating, review } = req.body;
  console.log("request body:", req.body);

  console.log("Adding wine to cellar:", { username, wine_id, rating, review });
  if (!username || !wine_id) {
    return res.status(400).json({ error: "Missing fields" });
  }
  try {
    // Get user_id
    const user_id = await getUserId(username);
    if (!user_id) {
      return res.status(404).json({ error: "User not found" });
    }


    // Insert into rating table
    const ratingInsert = `
      INSERT INTO rating (user_id, wine_id, value, description)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, wine_id
    `;
    await pool.query(ratingInsert, [user_id, wine_id, rating, review]);

    // Insert into cellar table
    await pool.query(
      `INSERT INTO cellar (user_id, wine_id, date_added)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       `,
      [user_id, wine_id]
    );

    res.status(200).json({ message: "Wine added to cellar" });
  } catch (err) {
    console.error("Error adding wine to cellar:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


async function getUserId(username) {
  const userQuery = `
    SELECT user_id
    FROM users
    WHERE username = $1
  `;

  try {
    const result = await pool.query(userQuery, [username]);
    return result.rows.length > 0 ? result.rows[0].user_id : null;
  } catch (err) {
    console.error("Error fetching user_id:", err);
    throw err; // optional: rethrow or handle as needed
  }
}

async function getWineId(wineName) {
   const userQuery = `
    SELECT wine_id
    FROM wine
    WHERE name = $1
  `;

  try {
    const result = await pool.query(userQuery, [wineName]);
    return result.rows.length > 0 ? result.rows[0].wine_id : null;
  } catch (err) {
    console.error("Error fetching user_id:", err);
    throw err; 
  }
}


//this shouldnt work
async function getRatingId(user_id, wine_id) {
  const ratingQuery = `SELECT rating_id FROM cellar WHERE user_id = $1 AND wine_id =$2`;
  try {
    const result = await pool.query(ratingQuery, [user_id, wine_id]);
    return result.rows.length > 0 ? result.rows[0].rating_id : null;
  } catch (err) {
    console.error("Error fetching user_id:", err);
    throw err; // optional: rethrow or handle as needed
  }
}


app.listen(port, () => {
  console.log("Server started on port 8080");
});
