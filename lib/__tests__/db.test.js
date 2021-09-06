require("dotenv").config();
const dbInstance = require("../dbInstance");
const { mockerize } = require("../mockerize");
const {
  getUser,
  getWebsite,
  getUserWebsites,
  updateWebsite,
} = require("../db");

afterAll(async () => dbInstance.end());

const findById = (data, id) => data.find((el) => el.id === id);

describe("getUser", () => {
  it("should return an user", async () => {
    const uid = 2;
    const users = await mockerize("users.json");
    const user = await getUser(uid);
    expect(user).toMatchObject(findById(users, uid));
  });

  it("should be null", async () => {
    const uid = 101;
    const user = await getUser(uid);
    expect(user).toBe(null);
  });
});

describe("getWebsite", () => {
  it("should return a website", async () => {
    const wid = 2;
    const websites = await mockerize("websites.json");
    const website = await getWebsite(wid);
    expect(website).toMatchObject(findById(websites, wid));
  });

  it("should be null", async () => {
    const wid = 101;
    const website = await getWebsite(wid);
    expect(website).toBe(null);
  });
});

describe("getUserWebsites", () => {
  it("should return the user websites", async () => {
    const uid = 1;
    const mockedWebsites = await mockerize("websites.json");
    const websites = await getUserWebsites(uid);
    expect(websites).toMatchObject(
      mockedWebsites.filter((el) => el.used_id === uid)
    );
  });

  it("should be null", async () => {
    const wid = 101;
    const website = await getWebsite(wid);
    expect(website).toBe(null);
  });
});

describe("updateWebsite", () => {
  it("should return the user websites", async () => {
    const wid = 1;
    await mockerize("websites.json");
    const data = { name: "thisisupdated", url: "www.thisisupdated.com" };
    const updatedWebsite = await updateWebsite(wid, [
      data.name,
      data.url,
      false,
    ]);

    expect(updatedWebsite).toHaveProperty("name");
    expect(updatedWebsite.name).toBe(data.name);
    expect(updatedWebsite).toHaveProperty("url");
    expect(updatedWebsite.url).toBe(data.url);
    expect(updatedWebsite).toHaveProperty("shared");
    expect(updatedWebsite.shared).toBe(false);
  });
});