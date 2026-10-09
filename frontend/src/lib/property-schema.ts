import { z } from "zod";
const count = z
  .number()
  .int("Use um número inteiro.")
  .min(0, "Use 0 ou um número positivo.")
  .max(100, "O máximo é 100.")
  .nullable();
const amount = z
  .number()
  .min(0, "Use 0 ou um valor positivo.")
  .max(9999999999.99)
  .nullable();
export const propertySchema = z
  .object({
    title: z.string().trim().min(3, "Use ao menos 3 caracteres.").max(160),
    slug: z
      .string()
      .max(180)
      .regex(
        /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Use letras minúsculas, números e hífens.",
      ),
    description: z
      .string()
      .trim()
      .min(10, "Descreva a hospedagem com ao menos 10 caracteres.")
      .max(20000),
    type: z.enum(["CASA", "APARTAMENTO", "KITNET", "FLAT", "SOBRADO", "OUTRO"]),
    rent: z
      .number({
        invalid_type_error: "Informe um valor de referência para a temporada.",
      })
      .positive("Informe um valor maior que zero.")
      .max(9999999999.99),
    condoFee: amount,
    propertyTax: amount,
    area: z
      .number()
      .positive("Informe uma área maior que zero ou deixe em branco.")
      .max(99999999.99)
      .nullable(),
    bedrooms: count,
    suites: count,
    bathrooms: count,
    parking: count,
    guests: z
      .number()
      .int("Use um número inteiro.")
      .min(1, "Informe ao menos 1 hóspede ou deixe em branco.")
      .max(1000)
      .nullable(),
    city: z.string().trim().min(2, "Informe a cidade.").max(100),
    state: z
      .string()
      .regex(
        /^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/,
        "Selecione um estado.",
      ),
    neighborhood: z.string().trim().min(2, "Informe o bairro.").max(100),
    address: z.string().max(255),
    showAddress: z.boolean(),
    furnished: z.boolean(),
    petsAllowed: z.boolean(),
    featured: z.boolean(),
    status: z.enum(["RASCUNHO", "DISPONIVEL", "INDISPONIVEL"]),
    amenityIds: z.array(z.string().uuid()).max(50),
  })
  .refine(
    (v) => v.suites == null || v.bedrooms == null || v.suites <= v.bedrooms,
    {
      path: ["suites"],
      message: "Suítes não podem superar o total de quartos.",
    },
  );
export type PropertyForm = z.infer<typeof propertySchema>;
