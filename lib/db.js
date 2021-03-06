const { hash } = require("../utils/hash");
const { dbInstance } = require("./dbInstance");
const { Website, Setting, User, Browser } = require("./models");

const getAllWebsites = async () => {
  const data = await Website.fetchAll({ withRelated: ["user"] });
  return { data };
};

const getAllUsers = async () => {
  return User.fetchAll();
};

const getAllBrowsers = async () => {
  return Browser.fetchAll();
};

const getUserByEmail = async (email) => {
  return User.where("email", email).fetch({ require: false });
};

const getWebsiteBySeed = async (seed) => {
  return Website.where("seed", seed).fetch();
};

const getUserWebsites = async (id) => {
  return Website.where("user_id", id).fetchAll();
};

const getUserWebsite = async (uid, seed) => {
  return Website.where("user_id", uid).where("seed", seed).fetch();
};

const updateUserWebsite = async (uid, seed, data) => {
  return Website.where("user_id", uid)
    .where("seed", seed)
    .save({ shared: Boolean(Number(data.shared)), ...data }, { patch: true });
};

const deleteUserWebsite = async (uid, seed) => {
  return Website.where("user_id", uid).where("seed", seed).destroy();
};

const createUserWebsite = async (uid, data) => {
  return new Website({
    shared: Boolean(Number(data.shared)),
    user_id: uid,
    ...data,
  }).save();
};

const createUser = async (data) => {
  return new User({ password: hash(data.password), ...data }).save();
};

const updateUser = async (id, data) => {
  if (data.password) {
    data.password = hash("password");
  }

  return User.where("id", id).save({ ...data }, { patch: true });
};

const createSetting = async (data) => {
  return new Setting(data).save();
};

const getWebsiteViewsByBrowser = async (seed, range) => {
  return dbInstance
    .knex("events")
    .select("browsers.name as element")
    .count("events.id as views")
    .countDistinct("events.hash as unique")
    .join("browsers", "events.browser_id", "browsers.id")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .where("websites.seed", seed)
    .groupBy("browsers.name")
    .orderBy("views", "desc")
    .limit(8);
};

const getWebsiteViewsByCountry = async (seed, range) => {
  return dbInstance
    .knex("events")
    .select("locales.location as element")
    .count("element as views")
    .countDistinct("hash as unique")
    .join("locales", "events.locale_id", "locales.id")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .where("websites.seed", seed)
    .groupBy("locales.location")
    .orderBy("views", "desc")
    .limit(8);
};

const getWebsiteViewsByOs = async (seed, range) => {
  return dbInstance
    .knex("events")
    .select("oses.name as element")
    .count("events.id as views")
    .countDistinct("events.hash as unique")
    .join("oses", "events.os_id", "oses.id")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .where("websites.seed", seed)
    .groupBy("oses.name")
    .orderBy("views", "desc")
    .limit(8);
};

const getWebsiteViewsByPage = async (seed, range) => {
  return dbInstance
    .knex("events")
    .select("element")
    .count("events.id as views")
    .countDistinct("hash as unique")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .where("websites.seed", seed)
    .groupBy("element")
    .orderBy("views", "desc")
    .limit(8);
};

const getWebsiteViewsByReferrer = async (seed, range) => {
  return dbInstance
    .knex("events")
    .select("referrer as element")
    .count("events.id as views")
    .countDistinct("hash as unique")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= DATE_TRUNC('${range}', now())`)
    .where("events.type", "pageView")
    .whereNotNull("referrer")
    .where("websites.seed", seed)
    .groupBy("referrer")
    .orderBy("views", "desc")
    .limit(8);
};

const getWebsiteViewsBySeries = async (seed, range, factor) => {
  return dbInstance.knex.raw(`
    SELECT
      range.generate_series as range,
      SUM(
        COALESCE(e.views, 0)
      ) AS views
    FROM
      (
        SELECT
          generate_series(
            date_trunc('${range}', now()),
            date_trunc('${range}', now()) + '1 ${range}' :: interval - '1 ${factor}' :: interval,
            '1 ${factor}' :: interval
          ):: timestamptz
      ) as range
      LEFT JOIN (
        SELECT
          events.created_at AS day,
          COUNT(events.id) AS views
        FROM
          events
          JOIN websites on websites.id = events.website_id
        WHERE
          websites.seed = '${seed}'
        AND
          events.type = 'pageView'
        GROUP BY
          day
      ) AS e ON range.generate_series = date_trunc('${factor}', e.day)
    GROUP BY
      range
    ORDER BY
      range
  `);
};

const getWebsiteRealtimeVisitors = async (seed) => {
  return dbInstance
    .knex("events")
    .countDistinct("events.hash as visitors")
    .join("websites", "events.website_id", "websites.id")
    .whereRaw(`events.created_at >= (now() - '30 second' :: interval)`)
    .where("events.type", "pageView")
    .where("websites.seed", seed);
};

const getWebsitePerformance = async (seed, range) => {
  return dbInstance.knex.raw(`
    SELECT
      COUNT(events.created_at) as cp_views,
      COUNT(DISTINCT events.hash) as cp_unique,
      AVG(events.duration) as cp_visit_duration,
      (
        select
          COALESCE(sum(t.c), 0)
        from
          (
            select
              count(events.id) as c
            from
              events
            JOIN websites ON events.website_id = websites.id
            WHERE
              events.created_at >= DATE_TRUNC('${range}', now())
              AND websites.seed = '${seed}'
              AND events.type = 'pageView'
            group by
              hash
            having
              count(events.id) = 1
          ) as t
      ) as cp_bounces
    FROM
      events
      JOIN websites ON events.website_id = websites.id
    WHERE
      events.created_at >= DATE_TRUNC('${range}', now())
      AND websites.seed = '${seed}'
      AND events.type = 'pageView'
  `);
};

module.exports = {
  getAllBrowsers,
  getAllUsers,
  getAllWebsites,
  getUserByEmail,
  getUserWebsites,
  getUserWebsite,
  createUser,
  createSetting,
  createUserWebsite,
  updateUser,
  updateUserWebsite,
  deleteUserWebsite,
  getWebsiteBySeed,
  getWebsiteViewsByBrowser,
  getWebsiteViewsByCountry,
  getWebsiteViewsByOs,
  getWebsiteViewsByPage,
  getWebsiteViewsByReferrer,
  getWebsiteViewsBySeries,
  getWebsiteRealtimeVisitors,
  getWebsitePerformance,
};
