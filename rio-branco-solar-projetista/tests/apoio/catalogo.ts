import { CATALOGO_INICIAL } from "@/lib/catalogo/inicial";
import { mapaDeModulos, mapaDoCatalogo } from "@/lib/dominio/kit";
import type { ItemCatalogo } from "@/lib/dominio/tipos";

/** Catálogo inicial com ids previsíveis (o próprio código), para os testes. */
export const catalogo: ItemCatalogo[] = CATALOGO_INICIAL.map(({ codigo, ...item }) => ({ ...item, id: codigo }));
export const mapa = mapaDoCatalogo(catalogo);
export const specs = mapaDeModulos(catalogo);

export const MOD_620 = "mod-trina-620-ned19rc20";
export const MOD_630 = "mod-trina-630-ned19rc20";
export const MOD_650 = "mod-canadian-650-cs7n-ms";
export const INV_AUXSOL_5 = "inv-auxsol-asn-5sl-g2";
export const INV_SOFAR_5 = "inv-sofar-5ktlm-g3";
export const INV_SOLPLANET_10 = "inv-solplanet-asw10000-s";
