module.exports = function(db){
	var pollSchema = db.Schema({
		owner: {type: String, ref: 'User'},
		question: {type: String, required: true},
		date: {type: Date, default: Date.now}
	});

	return db.model('Poll', pollSchema);
};