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
                return res.status(500).json({ general: 'Something went wrong' });
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
            // auth/wrong-password
            // auth/user-not-found
            return res.status(403).json({ general: 'Wrong credentials, please try again' });
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

//Get any user's details
exports.getUserDetails = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.user = doc.data();
                return db.collection('chaats').where('userHandle', '==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get();
            } else {
                return res.status(404).json({ error: 'User not found'});
            }
        })
        .then(data => {
            userData.chaats = [];
            data.forEach(doc => {
                userData.chaats.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    chaatId: doc.id
                })
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        });
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
        //when we get authenticated user, need to return their notifications (to show on front end)
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            //return res.json(userData);
            return db.collection('notifications').where('recipient', '==', req.user.handle)
                .orderBy('createdAt','desc').limit(10).get();
        })
        .then(data => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    screamId: doc.data().screamId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id
                })
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
        file.pipe(fs.createWriteStream(filePath));
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

exports.markNotificationsRead = (req, res) => {
    //send back an array of notifications that user has just seen and mark them read
    //Use BatchWrite to update multiple documents
    let batch = db.batch();
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, { read: true});
    });
    batch.commit()
    .then(() => {
        return res.json({ messange: 'Notifications marked read'});
    })
    .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code});
    })
}