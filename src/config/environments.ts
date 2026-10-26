/**
 * OverraPrep AI is dedicated exclusively to higher education / university students:
 *   FUTA · OAU · UI · FUTEsIyin · UNILAG · etc.
 *
 * Each campus has its own scoped course outlines, past questions, and departmental curricula.
 */

export type EnvironmentType = "university" | "jamb";

export type InstitutionCode = "FUTA" | "OAU" | "UI" | "FUTESIYIN";

export interface InstitutionDef {
  code: InstitutionCode;
  name: string;
  short: string;
  city: string;
}

export const INSTITUTIONS: Record<InstitutionCode, InstitutionDef> = {
  FUTA: {
    code: "FUTA",
    name: "Federal University of Technology, Akure",
    short: "FUTA",
    city: "Akure",
  },
  OAU: {
    code: "OAU",
    name: "Obafemi Awolowo University",
    short: "OAU",
    city: "Ile-Ife",
  },
  UI: {
    code: "UI",
    name: "University of Ibadan",
    short: "UI",
    city: "Ibadan",
  },
  FUTESIYIN: {
    code: "FUTESIYIN",
    name: "Federal University of Technology and Environmental Studies, Iyin-Ekiti",
    short: "FUTEsIyin",
    city: "Iyin-Ekiti",
  },
};

export const INSTITUTION_LIST = Object.values(INSTITUTIONS);

export const INSTITUTION_CODES = INSTITUTION_LIST.map((i) => i.code);

export const isInstitutionCode = (code?: string | null): code is InstitutionCode =>
  !!code && (INSTITUTION_CODES as string[]).includes(code);

/** Human label for university campus. */
export const environmentLabel = (
  env: string,
  institution?: string | null
): string => {
  return isInstitutionCode(institution) ? INSTITUTIONS[institution].short : "University";
};

/** Full name used in headers and admin indicators. */
export const environmentFullName = (
  env: string,
  institution?: string | null
): string => {
  return isInstitutionCode(institution)
    ? INSTITUTIONS[institution].name
    : "University";
};

/** Admin environment switcher options — scoped to university institutions. */
export interface AdminEnvironmentOption {
  id: string;
  env: EnvironmentType;
  institution: InstitutionCode | null;
  label: string;
}

export const ADMIN_ENVIRONMENTS: AdminEnvironmentOption[] = [
  ...INSTITUTION_LIST.map((i) => ({
    id: i.code,
    env: "university" as const,
    institution: i.code,
    label: i.short,
  })),
];
