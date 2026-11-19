<script setup lang="ts">
import LegalPage from '@/components/LegalPage.vue';
import { siteOwner } from '@/data/siteOwner';
</script>

<template>
  <LegalPage title="Datenschutzerklärung">
    <section>
      <h2>Verantwortlicher</h2>
      <address>
        <div>{{ siteOwner.name }}</div>
        <div v-for="line in siteOwner.address" :key="line">{{ line }}</div>
        <div>
          E-Mail <a :href="`mailto:${siteOwner.email}`">{{ siteOwner.email }}</a>
        </div>
      </address>
    </section>

    <section>
      <h2>Hosting und Zugriffsdaten</h2>
      <p>
        Diese Website wird über GitHub Pages bereitgestellt. Beim Aufruf wird deine IP-Adresse
        technisch an GitHub übermittelt. GitHub speichert die IP-Adresse laut eigener Auskunft zu
        Sicherheitszwecken. Die Bereitstellung und Absicherung der Website liegen in meinem
        berechtigten Interesse nach Art. 6 Abs. 1 Buchst. f DSGVO.
      </p>
      <p>
        GitHub kann Daten auch außerhalb der EU und des EWR verarbeiten. Informationen zu
        Aufbewahrungskriterien und Garantien für internationale Übermittlungen stehen in der
        <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
        >
          Datenschutzerklärung von GitHub</a
        >.
      </p>
    </section>

    <section>
      <h2>Kontakt per E-Mail</h2>
      <p>
        Das Kontaktformular erstellt eine Nachricht in deinem E-Mail-Programm. Wenn du sie sendest,
        erhalte ich deine E-Mail-Adresse, den Nachrichteninhalt und gegebenenfalls deinen Namen.
        Mein E-Mail-Postfach wird über Gmail bereitgestellt. Informationen zur Verarbeitung durch
        den Anbieter stehen in der
        <a href="https://policies.google.com/privacy?hl=de">Google-Datenschutzerklärung</a>.
      </p>
      <p>
        Ich verwende deine Angaben zur Bearbeitung deiner Anfrage. Geht es um einen möglichen oder
        bestehenden Vertrag, gilt Art. 6 Abs. 1 Buchst. b DSGVO. Andere Anfragen bearbeite ich auf
        Grundlage meines berechtigten Interesses an der Kommunikation nach Art. 6 Abs. 1 Buchst. f
        DSGVO. Ich lösche die Korrespondenz, wenn sie für die Bearbeitung nicht mehr benötigt wird
        und keine gesetzlichen Aufbewahrungspflichten oder Rechtsansprüche eine längere Speicherung
        erfordern.
      </p>
    </section>

    <section>
      <h2>Farbschema im Browser</h2>
      <p>
        Wenn du zwischen hellem und dunklem Modus wechselst, speichert dein Browser die Auswahl
        lokal unter dem Schlüssel <code>portfolio-theme</code>. Sie bleibt verfügbar, bis du sie
        änderst oder die Website-Daten im Browser löschst. Die Speicherung dient der von dir
        gewählten Darstellung (§ 25 Abs. 2 Nr. 2 TDDDG). Die Auswahl wird von der Website nicht an
        einen Server gesendet.
      </p>
    </section>

    <section>
      <h2>Google Fonts</h2>
      <p>
        Diese Website verwendet Google Fonts für die Darstellung der Schriften. Beim Seitenaufruf
        verbindet sich dein Browser mit Google und lädt das Stylesheet von
        <code>fonts.googleapis.com</code> sowie die benötigten Schriftdateien von
        <code>fonts.gstatic.com</code>. Google erhält dabei deine IP-Adresse, die Adresse der
        angeforderten Datei und technische Angaben zum Browser. Je nach Browsereinstellung kann auch
        die Herkunft der Anfrage übermittelt werden.
      </p>
      <p>
        Für Nutzer mit gewöhnlichem Aufenthalt im EWR nennt Google als Ansprechpartner Google
        Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland. Daten können auch außerhalb
        des EWR verarbeitet werden. Weitere Informationen findest du in der
        <a href="https://policies.google.com/privacy?hl=de">Google-Datenschutzerklärung</a>
        und in Googles
        <a href="https://developers.google.com/fonts/docs/technical_considerations">
          technischen Hinweisen zu Google Fonts</a
        >.
      </p>
    </section>

    <section>
      <h2>Links zu anderen Websites</h2>
      <p>
        Instagram und externe Projektseiten sind als Links eingebunden. Beim Anklicken öffnest du
        die jeweilige Website. Für die dortige Verarbeitung gelten die Datenschutzhinweise des
        jeweiligen Anbieters.
      </p>
    </section>

    <section>
      <h2>Deine Rechte</h2>
      <p>
        Unter den gesetzlichen Voraussetzungen kannst du Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung und Datenübertragbarkeit verlangen (Art. 15 bis 20 DSGVO).
        Gegen eine Verarbeitung auf Grundlage berechtigter Interessen kannst du aus Gründen, die
        sich aus deiner besonderen Situation ergeben, Widerspruch einlegen (Art. 21 DSGVO).
      </p>
      <p>
        Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren (Art. 77 DSGVO),
        zum Beispiel beim
        <a href="https://www.datenschutz.saarland.de/">Unabhängigen Datenschutzzentrum Saarland</a>.
      </p>
    </section>
  </LegalPage>
</template>
