const { db } = require('../util/admin')

exports.getAllChaats = (req, res) =>{
    db
        .collection('chaats')
        .orderBy('createdAt', 'desc')
        .get()
        .then((data) => {
            let chaats = [];
            data.forEach((doc) => {
                chaats.push({
                    chaatId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt,
                    commentCount: doc.data().commentCount,
                    likeCount: doc.data().likeCount
                });
            });
            return res.json(chaats);
        })
        .catch((err) => {
            console.error(err);
            res.status(500).json({ error: err.code });
        });
};

exports.postOneChaat = (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({ body: 'Body must not be empty' });
    }

    const newChaat = {
        body: req.body.body,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };

    db.collection('chaats')
        .add(newChaat)
        .then((doc) => {
            const resChaat = newChaat;
            resChaat.chaatId = doc.id;
            res.json(resChaat);
        })
        .catch(err => {
            console.log(err);
            return res.status(500).json({ error: 'something went wrong' });
        });
};

exports.getChaat = (req, res) => {
    let chaatData = {};
    db.doc(`/chaats/${req.params.chaatId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Chaat not found'});
            }
            chaatData = doc.data();
            chaatData.chaatId = doc.id;
            return db
                .collection('comments')
                .orderBy('createdAt', 'desc')
                .where('chaatId', '==', req.params.chaatId)
                .get();
        })
        .then(data => {
            chaatData.comments = [];
            data.forEach(doc => {
                chaatData.comments.push(doc.data());
            });
            return res.json(chaatData);
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code });
        });
};

exports.commentOnChaat = (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({error: 'Cannot be empty'});
    }

    const newComment = {
        body: req.body.body,
        createdAt: new Date().toISOString(),
        chaatId: req.params.chaatId,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    };

    db.doc(`/chaats/${req.params.chaatId}`).get()
        .then(doc => {
            if(!doc.exists){
                return res.status(404).json({ error: 'Chaat not found'});
            }
            //return db.collection('comments').add(newComment);
            return doc.ref.update({ commentCount: doc.data().commentCount + 1});
        })
        .then(() => {
            return db.collection('comments').add(newComment);
        })
        .then(() => {
            return res.json(newComment);
        })
        .catch(err => {
            console.log(error);
            return res.status(500).json({ error: err.code});
        })
};

exports.likeChaat = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('chaatId', '==', req.params.chaatId).limit(1);

    const chaatDocument = db.doc(`/chaats/${req.params.chaatId}`);

    let chaatData = {};
    
    chaatDocument.get()
        .then(doc => {
            if(doc.exists){
                chaatData = doc.data();
                chaatData.chaatId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Chaat not found'});
            }
        })
        .then(data => {
            if(data.empty){
                return db.collection('likes').add({
                    chaatId: req.params.chaatId,
                    userHandle: req.user.handle
                })
                .then(() => {
                    chaatData.likeCount += 1;
                    return chaatDocument.update({ likeCount: chaatData.likeCount});
                })
                .then(() => {
                    return res.json(chaatData);
                })
            } else {
                return res.status(400).json({ error: 'Chaat already liked'});
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code});
        });
};

exports.unlikeChaat = (req, res) => {
    const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
        .where('chaatId', '==', req.params.chaatId).limit(1);

    const chaatDocument = db.doc(`/chaats/${req.params.chaatId}`);

    let chaatData;
    
    chaatDocument.get()
        .then(doc => {
            if(doc.exists){
                chaatData = doc.data();
                chaatData.chaatId = doc.id;
                return likeDocument.get();
            } else {
                return res.status(404).json({ error: 'Chaat not found'});
            }
        })
        .then(data => {
            if(data.empty){
                return res.status(400).json({ error: 'Scream already unliked'});
                
            } else {
                return db.doc(`/likes/${data.docs[0].id}`).delete()
                    .then(() => {
                        if(chaatData.likeCount > 0){
                            chaatData.likeCount -= 1;
                        } else {
                            chaatData.likeCount = 0;
                        }
                        return chaatDocument.update({ likeCount: chaatData.likeCount});
                    })
                    .then(() => {
                        return res.json(chaatData);
                    })
            }
        })
        .catch(err => {
            console.error(err);
            res.status(500).json({ error: err.code});
        });
};

exports.deleteChaat = (req, res) => {
    const docum = db.doc(`/chaats/${req.params.chaatId}`);
    docum.get()
        .then(doc => {
            if(!doc.exists){
                return res.status(400).json({ error: 'Chaat not found'});
            }
            if(doc.data().userHandle != req.user.handle){
                return res.status(403).json({ error: 'Unauthorized'});
            } else {
                return docum.delete();
            }
        })
        .then(() => {
            res.json({ message: 'Scream deleted successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code});
        })
};

//Create and Get Notification --> needed for Social Media Application
//Take advantage of Database Triggers to handle notifications