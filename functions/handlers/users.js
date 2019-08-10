const { admin, db } = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignUpData, validateLoginData, reduceUserDetails} = require('../util/validators');

exports.signUp = (req, res) => {
    let token, user_id;
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };
   
    const { valid, errors } = validateSignUpData(newUser);

    if(!valid){
        return res.status(400).json(errors);
    }

    const noImg = 'user-login-man-human-body-mobile-person-512.png';

    db.doc(`/users/${newUser.handle}`)
        .get()
        .then((doc) => {
            if(doc.exists){
                return res.status(400).json({ handle: 'this handle is already taken' });
            } else {
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            user_id = data.user.uid;
            return data.user.getIdToken();            
        })
        .then((id_token) => {
            token = id_token;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
                    config.storageBucket
                }/o/${noImg}?alt=media`,
                user_id
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
            //return res.status(201).json({ token });
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email: 'Email already in use' });
            } else {
                return res.status(500).json({ error: err.code });
            }
        });

};

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password,
    };

    const { valid, errors } = validateLoginData(user);

    if(!valid){
        return res.status(400).json(errors);
    }

    

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({token});
        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/wrong-password'){
                return res.status(403).json({ general: 'Wrong credentials, please try again' });
            } else {
                return res.status(500).json({error: err.code});
            }
        })
};

//add user details
exports.addUserDetails = (req, res) => {
    let userDetails = reduceUserDetails(req.body);

    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({ message: 'User updated successfully' });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code});
        })
};

//get user data
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes')
                    .where('userHandle', '==', req.user.handle)
                    .get();
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code});
        });
};      

//uploading profile image
exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldName, file, fileName, encoding, mimeType) => {
        if(mimeType !== 'image/jpeg' && mimeType !== 'image/png'){
            return res.status(400).json({ error: 'Wrong file type' });
        }
        //can have filename like im.age.png
        const imageExtension = fileName.split('.')[fileName.split('.').length - 1];
        imageFileName =  `${Math.random(Math.random() * 10000)}.${imageExtension}`;
        const filePath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filePath, mimeType };
        file.pipe(fs.createWriteStream(filePath))
    });
    busboy.on('finish',()=>{
        admin.storage().bucket().upload(imageToBeUploaded.filePath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimeType
                }
            }
        })
        .then(() => {
            //construct image url to add to user
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc( `/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
            return res.json({ message: 'Image uploaded successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
    });
    busboy.end(req.rawBody);
};