import Axios, { AxiosRequestConfig } from "axios";
import * as cheerio from "cheerio";
const axios: typeof Axios = require("axios").default;
const https = require("https");
const Path = require("path");
const csv = require("csvtojson");
import * as readLine from "readline";
import * as fs from "fs";
let post_payload = {
  Token: "55af47bae3a4104902c28cea54dcce98ae34318b",
  captchacode: "iV4DKr",
  lns: "1BI17CS010",
};

interface Result {
  subjectCode: string;
  subjectName: string;
  ia: number;
  ea: number;
  total: number;
  result: string;
}

let post_headers = {
  Host: " results.vtu.ac.in",
  Connection: " keep-alive",
  "Content-Length": " 80",
  "Cache-Control": " max-age=0",
  "Upgrade-Insecure-Requests": " 1",
  Origin: " https://results.vtu.ac.in",
  "Content-Type": " application/x-www-form-urlencoded",
  "User-Agent":
    " Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.111 Safari/537.36",
  Accept:
    " text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
  "Sec-Fetch-Site": " same-origin",
  "Sec-Fetch-Mode": " navigate",
  "Sec-Fetch-User": " ?1",
  "Sec-Fetch-Dest": " document",
  Referer: "https://results.vtu.ac.in/JJEcbcs22/index.php",
  "Accept-Encoding": " gzip, deflate, br",
  "Accept-Language": " en-GB,en-US;q=0.9,en;q=0.8",
  Cookie:
    " VISRE=4ldr63bhbo4it7marog3ndqt2c4c6r1o24t90rhhutdd82vm6tlqmitj0bbn22undfndp18pv1c04c3s8ib4472iumg09s2nv55taf2; VISRE=gl48oihilvkotdn96oofnj9ehtsm91gp97jg6ck6snen1btkeob4ru34jjqterit4pl3nldh6tg4uc4r89kdfle40pu17g47dds86s0",
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

async function getNewSession() {
  let url = "https://results.vtu.ac.in/JJEcbcs22/index.php";
  let headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Safari/605.1.15",
    Accept: "*/*",
    "Cache-Control": "no-cache",
    "Postman-Token": "b222b1f1-1fed-4490-965a-805f53a28e97",
    Host: "results.vtu.ac.in",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };
  let response = await axios.get(url, { headers, httpsAgent });
  const $ = cheerio.load(response.data);
  const token = $("input[name=Token]").attr("value");
  const img_url =  
                 "https://results.vtu.ac.in" + $("img[alt='CAPTCHA code']").attr("src");    
  post_payload.Token = token || "";
  let img_headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.5 Safari/605.1.15",
    Accept: "*/*",
    "Cache-Control": "no-cache",
    "Postman-Token": "063fdb07-fe60-466a-be5e-fe08dec56a21",
    Host: "results.vtu.ac.in",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };
  img_headers["Cookie"] = (response.headers["set-cookie"][0] as string).replace(
    `; path=/; secure; HttpOnly`,
    ""
  );
  post_headers["Cookie"] = img_headers["Cookie"];
  console.log(img_url);
  response = await axios.get(img_url, {
    headers: img_headers,
    httpsAgent,
    responseType: "stream",
  });
  const path = Path.resolve(__dirname, "cap.png");
  const writer = fs.createWriteStream(path);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  const input = readLine.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const temp_cap = await new Promise((resolve, reject) => {
    input.question("Enter the captcha code: ", (ans) => resolve(ans));
  });
  if (temp_cap != "") post_payload["captchacode"] = temp_cap as string;
  else {
    console.log("Empty Captcha - Getting new Session");
    await getNewSession();
  }
  return;
}

async function getResult(
  USN: string,
  Batch: number,
  Sem: number,
  Section: string
) {
  post_payload["lns"] = USN;
  const url = "https://results.vtu.ac.in/JJEcbcs22/resultpage.php";
  var data = `Token=${post_payload.Token}&lns=${post_payload.lns}&captchacode=${post_payload.captchacode}`;
  var config: AxiosRequestConfig = {
    method: "post",
    url: "https://results.vtu.ac.in/JJEcbcs22/resultpage.php",
    headers: post_headers,
    data: data,
    httpsAgent,
  };
  const res = await axios(config);
  if ((res.data as string).includes("Invalid captcha code !!!")) {
    console.log("Invalid Captcha, getting new session");
    await getNewSession();
    return getResult(USN, Batch, Sem, Section);
  } else if ((res.data as string).includes("Redirecting to VTU Results Site")) {
    await getNewSession();
    return getResult(USN, Batch, Sem, Section);
  } else if (
    (res.data as string).includes(
      "University Seat Number is not available or Invalid..!"
    )
  ) {
    throw new Error("Student Not Found");
  } else if (
    (res.data as string).includes("Please check website after 4 hour --- !!!")
  ) {
    console.log("IP Blocked");
  } else if ((res.data as string).includes("Semester : 2")) {
    let results: Array<Result> = [];
    const $ = cheerio.load(res.data);
    $(".divTable").each((idx, v) => {
      if (idx == 0)
        $(v)
          .find(".divTableBody>.divTableRow")
          .each((index, element) => {
            if (index != 0) {
              let result: Result = {} as Result;
              $(element)
                .find(".divTableCell")
                .each((i, ele) => {
                  switch (i) {
                    case 0:
                      result.subjectCode = $(ele).text().trim();
                    case 1:
                      result.subjectName = $(ele).text().trim();
                    case 2:
                      result.ia = parseInt($(ele).text().trim());
                    case 3:
                      result.ea = parseInt($(ele).text().trim());
                    case 4:
                      result.total = parseInt($(ele).text().trim());
                    case 5:
                      result.result = $(ele).text().trim();
                  }
                });
              results.push(result);
            }
          });
    });
    return {
      name: $("td[style='padding-left:15px']").text().replace(": ", ""),
      USN,
      results,
      Batch,
      Sem,
      Section,
    };
  } else if (
    res.data ==
    "<script type='text/javascript'>alert('Please check website after 2 hour !!!');window.location.href='index.php';</script>"
  ) {
    console.log("Session broken");
    await getNewSession();
    return getResult(USN, Batch, Sem, Section);
  }
}

(async () => {
  let Result: any[]=[];
  await getNewSession();
  const json1: Array<{
    USN: string;
    Section: string;
    Batch: string;
    Sem: string;
  }> = await csv().fromFile("1st.csv");
  for (const student of json1) {
    console.log(
      `${json1.indexOf(student) + 1}/${json1.length} - Name: ${
        student.USN
      } - Section: ${student.Section}`
    );
    try {
      const res = await getResult(
        student.USN,
        parseInt(student.Batch),
        parseInt(student.Sem),
        student.Section
      );
      Result.push(res);
    } catch (error) {
      console.log(error);
    }
  }
  fs.writeFile("result.json", JSON.stringify(Result, null, 2), (e) => {
    if (e) throw e;
  });
  console.log("=========================");
  console.log("Completed");
})();