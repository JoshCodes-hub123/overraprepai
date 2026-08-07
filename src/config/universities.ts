/**
 * University → faculty → departments mapping.
 * Add a new university by appending a new top-level key.
 */
export type UniversityCode = "FUTA" | "OAU" | "UI" | "FUTESIYIN";

export interface UniversityDef {
  code: UniversityCode;
  name: string;
  city: string;
  faculties: Record<string, string[]>;
}

export const UNIVERSITIES: Record<UniversityCode, UniversityDef> = {
  FUTA: {
    code: "FUTA",
    name: "Federal University of Technology, Akure",
    city: "Akure",
    faculties: {
      "School of Computing": [
        "Computer Science",
        "Information Technology",
        "Software Engineering",
        "Cyber Security",
      ],
      "School of Engineering & Engineering Technology": [
        "Civil Engineering",
        "Electrical & Electronics Engineering",
        "Mechanical Engineering",
        "Mechatronics Engineering",
        "Industrial & Production Engineering",
      ],
      "School of Sciences": [
        "Mathematics",
        "Physics",
        "Chemistry",
        "Statistics",
        "Biochemistry",
        "Microbiology",
      ],
      "School of Agriculture": [
        "Crop Science",
        "Animal Production",
        "Forestry",
        "Fisheries",
      ],
      "School of Management Technology": [
        "Project Management",
        "Industrial Mathematics",
        "Transport Management",
      ],
    },
  },
  OAU: {
    code: "OAU",
    name: "Obafemi Awolowo University",
    city: "Ile-Ife",
    faculties: {
      "Faculty of Science": [
        "Computer Science",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Botany",
        "Zoology",
      ],
      "Faculty of Technology": [
        "Computer Engineering",
        "Civil Engineering",
        "Electronic & Electrical Engineering",
        "Mechanical Engineering",
        "Chemical Engineering",
      ],
      "Faculty of Arts": [
        "English Language",
        "History",
        "Linguistics",
        "Music",
        "Religious Studies",
      ],
      "Faculty of Social Sciences": [
        "Economics",
        "Political Science",
        "Sociology",
        "Psychology",
        "Demography & Social Statistics",
      ],
      "Faculty of Law": ["Law"],
      "College of Health Sciences": [
        "Medicine & Surgery",
        "Nursing",
        "Dentistry",
        "Pharmacy",
      ],
    },
  },
  UI: {
    code: "UI",
    name: "University of Ibadan",
    city: "Ibadan",
    faculties: {
      "Faculty of Science": [
        "Computer Science",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Statistics",
        "Microbiology",
      ],
      "Faculty of Technology": [
        "Computer Engineering",
        "Civil Engineering",
        "Electrical & Electronic Engineering",
        "Mechanical Engineering",
        "Petroleum Engineering",
      ],
      "College of Medicine": [
        "Medicine & Surgery",
        "Nursing",
        "Physiotherapy",
        "Pharmacy",
      ],
      "Faculty of Arts": ["English", "History", "Philosophy", "Linguistics"],
      "Faculty of the Social Sciences": [
        "Economics",
        "Political Science",
        "Sociology",
        "Psychology",
      ],
      "Faculty of Law": ["Law"],
    },
  },
  FUTESIYIN: {
    code: "FUTESIYIN",
    name: "Federal University of Technology and Environmental Studies, Iyin-Ekiti",
    city: "Iyin-Ekiti",
    faculties: {
      "School of Computing": [
        "Computer Science",
        "Information Technology",
        "Cyber Security",
      ],
      "School of Engineering": [
        "Civil Engineering",
        "Electrical & Electronics Engineering",
        "Mechanical Engineering",
      ],
      "School of Environmental Studies": [
        "Architecture",
        "Estate Management",
        "Quantity Surveying",
        "Urban & Regional Planning",
      ],
      "School of Sciences": ["Mathematics", "Physics", "Chemistry", "Biology"],
    },
  },
};

export const UNIVERSITY_LIST = Object.values(UNIVERSITIES);

export const LEVELS = ["100", "200", "300", "400", "500", "600"] as const;

export const facultiesOf = (u?: string | null) =>
  u && UNIVERSITIES[u as UniversityCode]
    ? Object.keys(UNIVERSITIES[u as UniversityCode].faculties)
    : [];

export const departmentsOf = (u?: string | null, f?: string | null) =>
  u && f && UNIVERSITIES[u as UniversityCode]?.faculties[f]
    ? UNIVERSITIES[u as UniversityCode].faculties[f]
    : [];