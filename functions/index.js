const functions = require('firebase-functions');
const admin = require('firebase-admin');
const app = require('express')();
admin.initializeApp();

const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();

app.get('/screams', (req, res) => {
    db.collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let screams = [];
            data.forEach((doc) => {
                screams.push({
                    screamId: doc.id,
                    ...doc.data(),
                });
            });
            return res.json(screams);
        })
        .catch((err) => {
            console.error(err);
        });
});

app.post('/screams', (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString(),
    };

    db.collection('screams')
        .add(newScream)
        .then((doc) => {
            res.json({ message: `document ${doc.id} created successfully` });
        })
        .catch((err) => {
            res.status(500).json({ error: 'something went wrong' });
            console.error(err);
        });
});

// Sign Up
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    // TODO validate data
    let token, userId;
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if (doc.exists) {
                return res
                    .status(400)
                    .json({ handle: 'this handle already exists' });
            } else {
                firebase
                    .auth()
                    .createUserWithEmailAndPassword(
                        newUser.email,
                        newUser.password
                    )
                    .then((data) => {
                        userId = data.user.uid;
                        return data.user.getIdToken();
                    })
                    .then((idToken) => {
                        token = idToken;
                        const userCredentials = {
                            userId: userId,
                            handle: newUser.handle,
                            email: newUser.email,
                            createdAt: new Date().toISOString(),
                        };
                        return db
                            .doc(`/users/${newUser.handle}`)
                            .set(userCredentials);
                    })
                    .then(() => {
                        return res.status(201).json({ token });
                    })
                    .catch((err) => {
                        console.error(err);
                        if (err.code === 'auth/email-already-in-use') {
                            return res.status(400).json({ error: err.message });
                        } else {
                            return res.status(500).json({ error: err.message });
                        }
                    });
            }
        });
});

exports.api = functions.region('southamerica-east1').https.onRequest(app);
