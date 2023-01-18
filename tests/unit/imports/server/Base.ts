/* eslint-disable jolly-roger/no-sync-mongo-methods */
import { Random } from 'meteor/random';
import { assert } from 'chai';
import Base from '../../../../imports/lib/models/Base';
import BaseSchema from '../../../../imports/lib/schemas/Base';

interface TestModelType {
  _id: string;
  deleted: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | undefined;
  updatedBy: string | undefined;
}

const TestModel = new Base<TestModelType>('test_model');
TestModel.attachSchema(BaseSchema);

// Note: these tests seem fairly straightforward, but they mostly exist to
// detect if internal Meteor implementation changes cause our custom wrapper
// functions to break, like they did with #1370.
describe('Base', function () {
  let deletedModelId: string;
  let undeletedModelId: string;

  before(async function () {
    await TestModel.removeAsync({});

    const fakeUserId = Random.id();

    deletedModelId = await TestModel.insertAsync({
      createdBy: fakeUserId,
      deleted: true,
    });

    undeletedModelId = await TestModel.insertAsync({
      createdBy: fakeUserId,
    });
  });

  describe('find', function () {
    it('finds only undeleted models', async function () {
      const models = await TestModel.find({}).fetchAsync();
      assert.sameMembers(models.map((m) => m._id), [undeletedModelId]);
    });
  });

  describe('findOne', function () {
    it('finds only undeleted models', function () {
      assert.isUndefined(TestModel.findOne(deletedModelId));
      assert.isObject(TestModel.findOne(undeletedModelId));
    });
  });

  describe('findOneAsync', function () {
    it('finds only undeleted models', async function () {
      assert.isUndefined(await TestModel.findOneAsync(deletedModelId));
      assert.isObject(await TestModel.findOneAsync(undeletedModelId));
    });
  });

  describe('findDeleted', function () {
    it('finds only deleted models', async function () {
      const models = await TestModel.findDeleted({}).fetchAsync();
      assert.sameMembers(models.map((m) => m._id), [deletedModelId]);
    });
  });

  describe('findOneDeleted', function () {
    it('finds only deleted models', function () {
      assert.isUndefined(TestModel.findOneDeleted(undeletedModelId));
      assert.isObject(TestModel.findOneDeleted(deletedModelId));
    });
  });

  describe('findOneDeletedAsync', function () {
    it('finds only deleted models', async function () {
      assert.isUndefined(await TestModel.findOneDeletedAsync(undeletedModelId));
      assert.isObject(await TestModel.findOneDeletedAsync(deletedModelId));
    });
  });

  describe('findAllowingDeleted', function () {
    it('finds both deleted and undeleted models', async function () {
      const models = await TestModel.findAllowingDeleted({}).fetchAsync();
      assert.sameMembers(models.map((m) => m._id), [deletedModelId, undeletedModelId]);
    });
  });

  describe('findOneAllowingDeleted', function () {
    it('finds both deleted and undeleted models', function () {
      assert.isObject(TestModel.findOneAllowingDeleted(deletedModelId));
      assert.isObject(TestModel.findOneAllowingDeleted(undeletedModelId));
    });
  });

  describe('findOneAllowingDeletedAsync', function () {
    it('finds both deleted and undeleted models', async function () {
      assert.isObject(await TestModel.findOneAllowingDeletedAsync(deletedModelId));
      assert.isObject(await TestModel.findOneAllowingDeletedAsync(undeletedModelId));
    });
  });
});
