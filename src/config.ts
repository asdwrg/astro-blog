export const SITE = {
  website: "https://blog.ymdr.top/", // replace this with your deployed domain
  author: "Ymdr",
  profile: "https://ymdr.top/",
  desc: "A minimal blog .",
  title: "YMDR",
  ogImage: "NoWork.jpg",
  lightAndDarkMode: true,
  postPerIndex: 3,
  postPerPage: 5,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/asdwrg/astro-paper/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
