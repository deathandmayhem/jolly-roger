Template['hunts/show'].helpers({
  hunt() {
    let huntId = Iron.controller().params.id;
    return JR.Models.Hunts.findOne(huntId);
  }
});
Template['hunts/show'].onCreated(function() {
  let c = Iron.controller();
  this.subscribe('mongo.hunts', {_id: c.params.id});
  this.subscribe('mongo.puzzles', {hunt: c.params.id});
});
