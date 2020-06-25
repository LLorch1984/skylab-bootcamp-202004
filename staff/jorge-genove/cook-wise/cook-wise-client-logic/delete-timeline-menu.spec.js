require("dotenv").config();

const {
  env: { TEST_MONGODB_URL: MONGODB_URL, API_URL, SECRET },
} = process;

const deleteTimeline = require("./delete-timeline-menu");
const { floor, random } = Math;
const { expect } = require("chai");
require("cook-wise-commons/polyfills/json");
const {
  mongoose,
  models: { User, Recipes, Ingredients },
} = require("cook-wise-data");
const bcrypt = require("bcryptjs");
const logic = require(".");
global.fetch = require("node-fetch");
const notAsyncStorage = require("not-async-storage");
const jwt = require("jsonwebtoken");

logic.__context__.API_URL = API_URL;
logic.__context__.storage = notAsyncStorage;

describe("delete timeline menu", () => {
  let name, surname, email, password, encryptedPassword, userId;
  let recipeName,
    recipeAuthor,
    description,
    time,
    ingredients = [],
    recipeId;
  let weekday;
  let ingridient, ingredientId;
  let quantity, ingredientType;
  let schedule = {};
  let user;

  before(async () => {
    await mongoose.connect(MONGODB_URL, { unifiedTopology: true });
    await Promise.all([
      User.deleteMany(),
      Recipes.deleteMany(),
      Ingredients.deleteMany(),
    ]);
  });

  beforeEach(async () => {
    name = `name-${random()}`;
    surname = `surname-${random()}`;
    email = `email-${random()}@gmail.com`;
    password = `password-${random()}`;
    encryptedPassword = await bcrypt.hash(password, 10);

    user = await User.create({
      name,
      surname,
      email,
      password,
      encryptedPassword,
    });
    userId = user.id;
    const token = jwt.sign({ sub: userId }, SECRET, { expiresIn: "1d" });
    await logic.__context__.storage.setItem("TOKEN", token);

    ingredientName = `ingredientName-${random()}`;
    const newIngredient = await Ingredients.create({ name: ingredientName });
    ingredientId = newIngredient.id;

    quantity = random();
    ingredientType = newIngredient.id;

    ingredient = { ingredient: ingredientType, quantity };

    recipeName = `recipeName-${random()}`;
    recipeAuthor = `author_${random()}`;
    description = `description-${random()}`;
    time = random();
    ingredients.push(ingredient);

    const recipe = await Recipes.create({
      name: recipeName,
      author: recipeAuthor,
      description,
      time,
      ingredients,
    });
    recipeId = recipe.id;

    await User.findByIdAndUpdate(userId, { $addToSet: { recipes: recipe } });

    schedule.weekday = "monday";
    schedule.timeline = "lunch";
    schedule.recipe = recipeId;

    user.schedule.push(schedule);

    schedule.weekday = "monday";
    schedule.timeline = "dinner";
    schedule.recipe = recipeId;

    user.schedule.push(schedule);

    await user.save();

    weekday = "monday";
    timeline = "lunch";
  });

  it("should remove schedule by reference of day and timeline", async () => {
    await deleteTimeline(weekday, timeline);

    let result = await User.findById(userId).populate("user").lean();
    expect(result).to.exist;
    expect(result.schedule).to.exist;
    expect(result.schedule).to.be.instanceof(Array);
    expect(result.schedule.length).to.be.equal(1);
  });

  it("should dont remove it concidences not matched", async () => {
    weekday = "tuesday";

    await deleteTimeline(weekday, timeline);
    let result = await User.findById(userId).populate("user").lean();
    expect(result).to.exist;
    expect(result.schedule).to.exist;
    expect(result.schedule).to.be.instanceof(Array);
    expect(result.schedule.length).to.be.equal(2);
  });

  it("shoul throw an error if user dont exist", async () => {
    await User.deleteMany();
    try {
      await deleteTimeline(weekday, timeline);
    } catch (error) {
      expect(error).to.exist;
      expect(error).to.be.instanceof(Error);
      expect(error.message).to.equal(`user with id ${userId} does not exist`);
    }
  });

  it("should throw an error if weekday its not an string", () => {
    expect(function () {
      deleteTimeline(undefined, timeline);
    }).to.throw(TypeError, "undefined is not a string");

    expect(function () {
      deleteTimeline(1, timeline);
    }).to.throw(TypeError, "1 is not a string");

    expect(function () {
      deleteTimeline(null, timeline);
    }).to.throw(TypeError, "null is not a string");

    expect(function () {
      deleteTimeline(true, timeline);
    }).to.throw(TypeError, "true is not a string");
  });

  it("should throw an error if timeline its not an string", () => {
    expect(function () {
      deleteTimeline(weekday, undefined);
    }).to.throw(TypeError, "undefined is not a string");

    expect(function () {
      deleteTimeline(weekday, 1);
    }).to.throw(TypeError, "1 is not a string");

    expect(function () {
      deleteTimeline(weekday, null);
    }).to.throw(TypeError, "null is not a string");

    expect(function () {
      deleteTimeline(weekday, true);
    }).to.throw(TypeError, "true is not a string");
  });

  after(async () => {
    await Promise.all([
      User.deleteMany(),
      Ingredients.deleteMany(),
      Recipes.deleteMany(),
    ]);
    await mongoose.disconnect();
  });
});
