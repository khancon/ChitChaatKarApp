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
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead
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
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/chaats/${snapshot.data().chaatId}`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
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
            .catch(err => {
                console.error(err);
            });
    });

exports.deleteNotificationOnUnLike = functions.firestore.document('likes/{id}')
    .onDelete((snapshot) => {
        return db.doc(`/notifications/${snapshot.id}`)
            .delete()
            .catch(err => {
                console.error(err);
                return;
            });
    });
    
exports.createNotificationOnComment = functions.firestore.document('comments/{id}')
    .onCreate((snapshot) => {
        return db.doc(`/chaats/${snapshot.data().chaatId}`).get()
            .then(doc => {
                if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
                    return db.doc(`/notifications/${snapshot.id}`).set({
                        createdAt: new Date().toISOString(),
                        recipient: doc.data().userHandle,
                        sender: snapshot.data().userHandle,
                        type: 'comment',
                        read: false,
                        chaatId: doc.id
                    });
                }
            })
            .catch(err => {
                console.error(err);
                return;
            });
    });

exports.onUserImageChange = functions.firestore.document('/users/{user_Id}')
    .onUpdate((change) => {
        console.log(change.before.data());
        console.log(change.after.data());
        if(change.before.data().imageUrl !== change.after.data().imageUrl){
            console.log('image has changed');
            let batch = db.batch();
            return db.collection('chaats').where('userHandle', '==', change.before.data().handle).get()
            .then(data => {
                data.forEach(doc => {
                    const chaat = db.doc(`/chaats/${doc.id}`);
                    batch.update(chaat, { userImage: change.after.data().imageUrl});
                })
                return batch.commit();
            });
        } else {
            return true;
        }
    });

exports.onChaatDelete = functions.firestore.document('/chaats/{chaatId}')
    .onDelete((snapshot, context) => {
        const chaatId = context.params.chaatId;
        const batch = db.batch();
        return db.collection('comments').where('chaatId', '==', chaatId).get()
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/comments/${doc.id}`));
                })
                return db.collection('likes').where('chaatId', '==', chaatId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/likes/${doc.id}`));
                })
                return db.collection('notifications').where('chaatId', '==', chaatId).get();
            })
            .then(data => {
                data.forEach(doc => {
                    batch.delete(db.doc(`/notifications/${doc.id}`));
                })
                return batch.commit();
            })
            .catch(err => console.error(err));
    })

