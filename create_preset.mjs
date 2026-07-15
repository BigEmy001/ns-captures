import https from "https";

const options = {
  hostname: "api.cloudinary.com",
  path: "/v1_1/odu5iecy/upload_presets",
  method: "POST",
  auth: "639991492268787:ZKzoJpEHMm-nCbKjOZ0EwlNlsDA",
  headers: { "Content-Type": "application/json" },
};

const req = https.request(options, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => console.log(body));
});
req.write(JSON.stringify({
  name: "ns_captures",
  unsigned: true,
  folder: "nscaptures"
}));
req.end();
