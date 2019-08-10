const { admin } = require('./admin');
const { db } = require('../util/admin')

module.exports = (req, res, next) => {
    let token_id;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        token_id = req.headers.authorization.split('Bearer ')[1];
        console.log("In FBAuth, tokenId:", token_id);
    } else {
        console.error('No token found');
        return res.status(403).json({error: 'Unauthorized access'});
    }

    admin.auth().verifyIdToken(token_id)
        .then(decodedToken => {
            req.user = decodedToken;
            console.log("Decoded Token: ", decodedToken);
            return db.collection('users')
                .where('user_id', '==', req.user.uid)
                .limit(1)
                .get();
        })
        .then(data => {
            //console.log("Data: ", data);
            //console.log("Data.docs: ", data.docs[0].data().handle);
            req.user.handle = data.docs[0].data().handle;
            req.user.imageUrl = data.docs[0].data().imageUrl;
            //console.log("Next(): ", next());
            return next();
        })
        .catch(err => {
            console.error('Cannot verify token ', err);
            return res.status(403).json(err);
        });
};