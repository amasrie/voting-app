module.exports = function(db){
	var pollOptionSchema = db.Schema({
		name: {type: String, required: true},
		vote: {type: Number, default: 0},
		poll: {type: db.Schema.Types.ObjectId, ref: 'Poll'}
	});

	return db.model('PollOption', pollOptionSchema);
};