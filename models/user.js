module.exports = function(db){
	var userSchema = db.Schema({
		name: {
			type: String,
			required: true
		},
		email: {
			type: String,
			unique: true,
			lowercase: true,
			required: 'Email address is required',
			match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
		},
		password: {type: String, required: true}
	});

	return db.model('User', userSchema);
};