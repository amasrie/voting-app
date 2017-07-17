module.exports = function(db){
	var voteSchema = db.Schema({
		user: {type: String, required: true},
		poll: {type: db.Schema.Types.ObjectId, ref: 'Poll'}
	});

	voteSchema.index({ user: 1, poll: 1 }, { unique: true });

	return db.model('Vote', voteSchema);
};