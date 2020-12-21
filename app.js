//Included all our imports
const express = require("express");
const app = express();
const fs = require("fs");
const multer = require("multer");
const {createWorker} = require("tesseract.js");
const worker = createWorker({
	logger: m => console.log(m), // Add logger here
});

//Storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "./uploads");
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});

const upload = multer({storage: storage}).single("pancard");
app.set("view engine", "ejs");

//Routes

app.get("/", (req, res) => {
	res.render("index");
});

app.post("/upload", (req, res) => {
	upload(req, res, err => {
		fs.readFile(`./uploads/${req.file.originalname}`, (err, filedata) => {
			if (err) return console.log("this is the error inside upload", err);

			(async () => {
				try {
					await worker.load();
					await worker.loadLanguage("eng");
					await worker.initialize("eng");
					const {
						data: {text},
					} = await worker.recognize(filedata);
					const lines = text.split("\n");
					const arr = [];
					for (var i = 0; i < lines.length; i++) {
						if (lines[i].length == 0) {
							continue;
						}
						arr.push(lines[i].trim());
					}
					let lineno = 0;
					for (var i = 0; i < arr.length; i++) {
						if (
							/INCOMETAXDEPARWENT @|mcommx|INCOME|TAX|GOW|GOVT|GOVERNMENT|OVERNMENT|VERNMENT|DEPARTMENT|EPARTMENT|PARTMENT|ARTMENT|INDIA|NDIA/i.test(
								arr[i]
							)
						) {
							lineno = i;
							arr.splice(0, lineno + 1);
							break;
						}
					}
					let name = arr[0].trim().replace(/(<([^>]+)>)/gi, "");
					let fname = arr[1]
						.trim()
						.replace(/(<([^>]+)>)/gi, "")
						.replace(/[:|]/g, "");

					let dobarr = arr[2].trim().match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
					let dob = new Date(dobarr[3], dobarr[2] - 1, dobarr[1]);
					let pan = arr[4]
						.trim()
						.split(" ")
						.filter(item => item.length == 10);

					console.log("name : ", name);
					console.log("fname : ", fname);
					console.log("dob : ", dob);
					console.log("pan_no : ", pan.join(""));

					res.json({
						Name: `${name}`,
						FatherName: `${fname}`,
						DOB: `${dob}`,
						PAN: `${pan}`,
					});
					await worker.terminate();
				} catch (err) {
					console.log(err);
					res.json({
						Name: "",
						FatherName: "",
						DOB: "",
						PAN: "",
					})
				}
			})();

			// worker
			// 	.recognize(data)
			// 	.then(result => {
			// 		res.send(result.text);
			// 	})
			// 	.finally(() => worker.terminate());
		});
	});
});

//Starting our Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("server is running ${PORT}"));
