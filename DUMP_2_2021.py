import json
from pymongo import MongoClient
import re
client = MongoClient("graph.resnal.ml", 27017)
db = client.data
student = db.students
marks = db.marks

# Helper Methods


def getGrade(USN, batch, sem):
    selected_student = student.find(
        {"usn": USN, "batch": batch, "sem": sem})[0]
    for i in marks.find({"sid": str(selected_student["_id"])}):
        total = 100
        if(i["subjectCode"]=="17CSP85" or i["subjectCode"]=="15CSP85"):
            total=200
        grade = 0
        if int(i["totalMarks"]) >= 90/100*total:
            grade = 10
        elif 80/100*total <= int(i["totalMarks"]) <= 89/100*total:
            grade = 9
        elif 70/100*total <= int(i["totalMarks"]) <= 79/100*total:
            grade = 8
        elif 60/100*total <= int(i["totalMarks"]) <= 69/100*total:
            grade = 7
        elif 50/100*total <= int(i["totalMarks"]) <= 59/100*total:
            grade = 6
        elif 45/100*total <= int(i["totalMarks"]) <= 49/100*total:
            grade = 5
        elif 40/100*total <= int(i["totalMarks"]) <= 44/100*total:
            grade = 4
        elif int(i["totalMarks"]) < 40/100*total:
            grade = 0
        marks.update_one({"_id": i["_id"]}, {"$set": {"grade": grade}})


def totalFCD(USN, batch, sem):
    selected_student = student.find(
        {"usn": USN, "batch": batch, "sem": sem})[0]
    total = 0
    total_marks = 0
    FCD = ""
    for j in marks.find({"sid": str(selected_student["_id"])}):
        if j["fcd"] == "F":
            student.update_one(
                {"_id": selected_student["_id"]}, {"$set": {"totalFCD": "F"}}
            )
            return
        total += int(j["totalMarks"])
        if j['subjectCode']=="17CSP85" or j["subjectCode"]=="15CSP85":
            total_marks += 200
        else:
            total_marks += 100
    if total >= 70/100*total_marks:
        FCD = "FCD"
    elif total >= 60/100*total_marks:
        FCD = "FC"
    elif  total >= 50/100*total_marks:
        FCD = "SC"
    else:
        FCD = "P"
    student.update_one({"_id": selected_student["_id"]}, {
                       "$set": {"totalFCD": FCD}})


def FCD(USN, batch, sem):
    selected_student = student.find(
        {"usn": USN, "batch": batch, "sem": sem})[0]
    for i in marks.find({"sid": str(selected_student["_id"])}):
        total = 100
        if(i["subjectCode"]=="17CSP85" or i["subjectCode"]=="15CSP85"):
            total=200
        if i["result"] == "F" or i["result"] == "A" or i["result"] == "X":
            FCD = "F"
        else:
            if 70/100*total <= int(i["totalMarks"]) <= 100/100*total:
                FCD = "FCD"
            elif 60/100*total <= int(i["totalMarks"]) <= 69/100*total:
                FCD = "FC"
            elif 50/100*total <= int(i["totalMarks"]) <= 59/100*total:
                FCD = "SC"
            elif 40/100*total <= int(i["totalMarks"]) <= 49/100*total:
                FCD = "P"
            else:
                FCD = "F"
        marks.update_one({"_id": i["_id"]}, {"$set": {"fcd": FCD}})


def GPA(USN, batch, sem):
    selected_student = student.find(
        {"usn": USN, "batch": batch, "sem": sem})[0]
    totalgrade = 0
    totalCredit = 0
    gpa = 0
    roundoff = 0
    for j in marks.find({"sid": str(selected_student["_id"])}):
        totalgrade += j["grade"] * getCredit(j["subjectCode"])
        totalCredit += 10 * getCredit(j["subjectCode"])
    gpa = (totalgrade / totalCredit) * 10
    roundoff = round(gpa, 2)
    student.update_one({"_id": selected_student["_id"]}, {
                       "$set": {"gpa": roundoff}})


def getCredit(subcode):
    if subcode == "21MAT21":
        return 3
    if subcode == "21CHE22":
        return 3
    if subcode == "21PSP23":
        return 3
    if subcode == "21ELN24":
        return 3
    if subcode == "21EME25":
        return 3
    if subcode == "21CHEL26":
        return 1
    if subcode == "21CPL27":
        return 1
    if subcode == "21EGH28":
        return 2
    if subcode == "21IDT29" or subcode == "21SFH29" or subcode == "21SFH19" or subcode=="21IDT19":
        return 1


def calculateTotal(USN, batch, sem):
    print(USN)
    selected_student = student.find(
        {"usn": USN, "batch": batch, "sem": sem})[0]
    total = 0
    for j in marks.find({"sid": str(selected_student["_id"])}):
        total += int(j["totalMarks"])
    student.update_one({"_id": selected_student["_id"]}, {
                       "$set": {"totalmarks": total}})

data = []
with open('./result.json') as f:
    data = json.load(f)

if __name__ == "__main__":
    for s in data:
        USN = s["USN"]
        print("USN:-" + USN)
        stu = {
            "usn": USN,
            "section": s["Section"],
            "batch": str(int(s["Batch"])),
            "sem": int(s["Sem"]),
        }
        try:
            stu_id = student.insert_one(stu).inserted_id
        except:
            print("Student Data Already Exists")
            continue
        res = s["results"]
        student.update_one({"_id": stu_id}, {"$set": {"name": s["name"]}})
        print(s["name"])
        for r in res:
            mark = {
                "sid": str(stu_id),
                "subjectCode": r["subjectCode"],
                "subjectName": r["subjectName"],
                "internalMarks": r["ia"],
                "externalMarks": r["ea"],
                "totalMarks": r["total"],
                "result": r["result"],
            }
            marks.insert_one(mark)
        getGrade(USN, str(int(s["Batch"])), s["Sem"])
        FCD(USN, str(int(s["Batch"])), s["Sem"])
        totalFCD(USN, str(int(s["Batch"])), s["Sem"])
        GPA(USN, str(int(s["Batch"])), s["Sem"])
        calculateTotal(USN, str(int(s["Batch"])), s["Sem"]  )
    print("Done")
