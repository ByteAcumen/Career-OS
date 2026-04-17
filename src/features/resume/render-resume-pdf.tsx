import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Link,
  renderToBuffer,
} from "@react-pdf/renderer";

import type { ResumeDraft } from "@/features/resume/build-resume";

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fMZhrib2Bg-4.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf", fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 46,
    paddingRight: 46,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 12,
    textAlign: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: 600,
    marginBottom: 4,
    color: "#0a0a0a",
  },
  headerDetails: {
    fontSize: 9.5,
    color: "#404040",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  link: {
    color: "#404040",
    textDecoration: "none",
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    borderBottomStyle: "solid",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  itemTitle: {
    fontWeight: 600,
    fontSize: 11,
  },
  itemSubtitle: {
    fontSize: 9.5,
    color: "#525252",
    fontStyle: "italic",
    marginBottom: 3,
  },
  bulletList: {
    marginTop: 2,
    marginBottom: 6,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-start",
  },
  bulletPoint: {
    width: 10,
    fontSize: 10.5,
    lineHeight: 1.3,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
    color: "#262626",
  },
  focusAreasText: {
    fontSize: 10,
    color: "#404040",
    marginBottom: 8,
  },
  editingNotes: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  editingNoteItem: {
    fontSize: 9,
    color: "#737373",
    marginBottom: 2,
  }
});

const ResumeDocument = ({ resume }: { resume: ResumeDraft }) => (
  <Document>
    <Page size="LETTER" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{resume.header.name}</Text>
        <View style={styles.headerDetails}>
          <Text>{resume.header.email}</Text>
          {resume.header.education && (
            <>
              <Text>•</Text>
              <Text>{resume.header.education}</Text>
            </>
          )}
          {resume.header.links.map((link, idx) => (
            <React.Fragment key={idx}>
              <Text>•</Text>
              <Link src={link.url} style={styles.link}>{link.label}</Link>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Summary */}
      {resume.summaryBullets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.bulletList}>
            {resume.summaryBullets.map((bullet, idx) => (
              <View style={styles.bulletItem} key={idx}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Focus Areas */}
      {resume.focusAreas.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <Text style={styles.focusAreasText}>{resume.focusAreas.join(" | ")}</Text>
        </View>
      )}

      {/* Experience / Projects */}
      {resume.projectHighlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selected Projects & Experience</Text>
          {resume.projectHighlights.map((project, idx) => (
            <View key={idx} wrap={false} style={{ marginBottom: 4 }}>
              <View style={styles.itemRow}>
                <Text style={styles.itemTitle}>{project.title}</Text>
                {project.link && (
                  <Link src={project.link} style={{ fontSize: 9, color: "#525252" }}>
                    View Project
                  </Link>
                )}
              </View>
              <Text style={styles.itemSubtitle}>{project.subtitle}</Text>
              <View style={styles.bulletList}>
                {project.bullets.map((bullet, bIdx) => (
                  <View style={styles.bulletItem} key={bIdx}>
                    <Text style={styles.bulletPoint}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Problem Solving / DSA */}
      {resume.problemSolvingHighlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problem Solving</Text>
          <View style={styles.bulletList}>
            {resume.problemSolvingHighlights.map((bullet, idx) => (
              <View style={styles.bulletItem} key={idx}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Editing Notes */}
      {resume.editingNotes.length > 0 && (
        <View style={styles.editingNotes}>
          <Text style={{ fontSize: 10, fontWeight: 600, color: "#737373", marginBottom: 4 }}>
            AI Editing Notes:
          </Text>
          {resume.editingNotes.map((note, idx) => (
            <Text style={styles.editingNoteItem} key={idx}>- {note}</Text>
          ))}
        </View>
      )}

    </Page>
  </Document>
);

export async function renderResumePdf(resume: ResumeDraft): Promise<Uint8Array> {
  // renderToBuffer returns a Node Buffer, which IS a Uint8Array
  const buffer = await renderToBuffer(<ResumeDocument resume={resume} />);
  return new Uint8Array(buffer);
}
