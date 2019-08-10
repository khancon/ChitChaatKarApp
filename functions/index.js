const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');
const { db } = require('./util/admin');

const { 
    getAllChaats, 
    postOneChaat, 
    getChaat, 
    commentOnChaat,
    likeChaat,
    unlikeChaat,
    deleteChaat
} = require('./handlers/chaats');
const { 
    signUp, 
    login, 
    uploadImage, 
    addUserDetails, 
    getAuthenticatedUser 
} = require('./handlers/users')

app.get('/chaats', getAllChaats);
app.post('/chaat', FBAuth, postOneChaat);
app.post('/signup', signUp);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/chaat/:chaatId', getChaat);
app.post('/chaat/:chaatId/comment', FBAuth, commentOnChaat);
app.get('/chaat/:chaatId/like', FBAuth, likeChaat);
app.get('/chaat/:chaatId/unlike', FBAuth, unlikeChaat);
app.delete('/chaat/:chaatId', FBAuth, deleteChaat);

exports.api = functions.https.onRequest(app);
/*
exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        db.doc(`/chaats/${snapshot.data().chaatId}`).get()
            .then(doc => {
                if(doc.exists){
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'like',
                        read: false,
                        chaatId: doc.id
                    });
                }
            })
            .then(() => {
                return;
            })
            .catch(err => {
                console.error(err);
                return;
            })
    }) */