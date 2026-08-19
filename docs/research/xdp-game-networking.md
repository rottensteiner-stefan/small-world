# XDP (eXpress Data Path) für Game-Netzwerk-Infrastruktur

**Datum:** 2026-08-19
**Anlass:** Vom Maintainer verlinkter Artikel: ["XDP for Game Programmers"](https://mas-bandwidth.com/xdp-for-game-programmers/)

## Relevanz für `small-world`: aktuell keine

`small-world` ist eine rein clientseitige 3D-Engine (Browser, WebGL1/WebGL2/WebGPU über Vite).
Es gibt **keinen Server-/Netzwerk-Layer** im Projekt — kein Multiplayer, keine Sockets, kein
Backend. XDP setzt am Linux-Kernel eines **Servers** an, der UDP-Pakete verarbeitet. Das ist
komplett orthogonal zu dem, was diese Engine heute tut. Dieses Dokument ist daher reine
Wissensablage für den Fall, dass irgendwann ein Multiplayer-Server-Teil entsteht — keine
umsetzbare Empfehlung für den aktuellen Stand.

## Was ist XDP?

Eine Linux-Kernel-Bypass-Technologie: Programme (geschrieben in eBPF, einer leichtgewichtigen
Bytecode-VM im Kernel) fangen Netzwerkpakete am frühestmöglichen Punkt ab — "bevor der
Linux-Kernel irgendeine Allokation oder Verarbeitung für das Paket vornimmt". Klassisches
Socket-Networking hat teure Umwege: Kernel alloziert Speicher, verarbeitet das Paket, reicht es
an den User-Space weiter und wieder zurück zum Kernel/NIC. XDP überspringt das für die Pakete,
die es selbst behandeln will, und reicht nur den Rest normal an den Kernel weiter — ein Vorteil
gegenüber älteren DPDK-Ansätzen, die eigene NICs oder einen komplett selbst implementierten
TCP/IP-Stack brauchen.

## Warum das für Game-Server-Programmierer interessant ist

Der Artikel argumentiert, dass zukünftige Spiele (Stichwort 10-Gbit-Heimanschlüsse) klassische
Server-Architekturen an Bandbreitengrenzen bringen. XDP erlaubt Verarbeitung nahe Line-Rate bei
10 Gbit/s und mehr, weil der teure Kernel-Overhead entfällt.

## Kernmechanismen

- **Maps:** Lockless Datenstrukturen (Arrays, Hashes, Per-CPU-Varianten) für bidirektionale
  Kommunikation zwischen XDP-Programm und User-Space (z. B. für IP-Whitelists).
- **BTF + kfuncs:** Typ-Annotationen und Kernel-Modul-Funktionen, die Krypto-Operationen und
  komplexere Logik innerhalb von XDP erlauben, während sie die Sicherheitsanforderungen des
  BPF-Verifiers erfüllen.
- **Fähigkeiten auf XDP-Ebene:** Pakete verwerfen, Inhalt modifizieren/ersetzen, Pakete
  vergrößern/verkleinern, Antworten senden oder weiterleiten.

## Vorgestellte Beispiel-Implementierungen

- **XDP Reflect:** UDP-Pakete auf Port 40000 echoen.
- **XDP Drop:** Pakete verwerfen, die einen Hash-basierten Musterabgleich nicht bestehen
  (DDoS-Abwehr).
- **XDP Whitelist:** IP-Allowlists über Maps pflegen.
- **XDP Relay:** Validierte Pakete weiterleiten, Backend-Server-Adressen verstecken.

## Bekannte Einschränkungen

Der BPF-Verifier verlangt "extrem verankerte" Paketverarbeitung — Lesen von links nach rechts
über bekannte Offsets. Das Lesen von Paketend-Bytes oder die Übergabe variabler Datenlängen an
Kernel-Funktionen bleibt problematisch, was manche fortgeschrittenen Anwendungsfälle
einschränkt.

## Praktische Empfehlungen (aus dem Artikel, für Server-Infrastruktur)

1. **DDoS-Schutz:** Whitelist- und Pattern-Matching-Filter verwerfen bösartigen Traffic vor
   jeglicher Kernel-Verarbeitung.
2. **Relay-Netzwerke:** Relay-Server mit High-Capacity-NICs (10–100 Gbit/s) schützen
   Backend-Game-Server.
3. **Fundament für Spiele mit vielen Spielern:** Der Autor schlägt vor, komplette
   Backend-Systeme/skalierbare Game-Server für UDP-Request/Response fast vollständig innerhalb
   von XDP zu implementieren — als Ansatz für die nächste MMO-Generation.

**Setup-Voraussetzung laut Artikel:** Ubuntu 22.04 LTS mit Linux-Kernel 6.5, `libxdp` und
`libbpf`, aus Quellcode kompiliert.

## Fazit

Spannende, aber für `small-world` heute nicht anwendbare Technik — sie setzt einen dedizierten
Linux-Game-Server voraus, den es in diesem Projekt nicht gibt. Als Wissensablage aufbewahrt,
falls das Projekt jemals einen Multiplayer-Server-Teil bekommt.
