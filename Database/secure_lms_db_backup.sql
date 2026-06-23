CREATE DATABASE  IF NOT EXISTS `secure_lms_db` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `secure_lms_db`;
-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: secure_lms_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `course_modules`
--

DROP TABLE IF EXISTS `course_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_modules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `resource_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `module_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `order_index` int DEFAULT NULL,
  `duration_minutes` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `course_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course_modules_course_id` (`course_id`),
  CONSTRAINT `fk_module_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_modules`
--

LOCK TABLES `course_modules` WRITE;
/*!40000 ALTER TABLE `course_modules` DISABLE KEYS */;
INSERT INTO `course_modules` VALUES (1,'Module 1','idk','','READING',1,NULL,0,1,'2026-06-23 04:00:46','2026-06-23 04:01:55'),(2,'Module 1','idk','','READING',2,22,1,1,'2026-06-23 04:02:16','2026-06-23 04:02:16');
/*!40000 ALTER TABLE `course_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `difficulty_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_hours` int DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `published` tinyint(1) NOT NULL DEFAULT '0',
  `created_by_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `group_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_courses_created_by_id` (`created_by_id`),
  KEY `FKsk5s5seii4l48r1r9jutrvbwb` (`group_id`),
  CONSTRAINT `fk_course_user` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `FKsk5s5seii4l48r1r9jutrvbwb` FOREIGN KEY (`group_id`) REFERENCES `group_master` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Course 1','idk','Language','INTERMEDIATE',3,1,1,2,'2026-06-23 04:00:30','2026-06-23 04:00:30',4);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollment_completed_modules`
--

DROP TABLE IF EXISTS `enrollment_completed_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollment_completed_modules` (
  `enrollment_id` bigint NOT NULL,
  `module_id` bigint NOT NULL,
  PRIMARY KEY (`enrollment_id`,`module_id`),
  KEY `idx_ecm_enrollment_id` (`enrollment_id`),
  KEY `idx_ecm_module_id` (`module_id`),
  CONSTRAINT `fk_ecm_enrollment` FOREIGN KEY (`enrollment_id`) REFERENCES `enrollments` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollment_completed_modules`
--

LOCK TABLES `enrollment_completed_modules` WRITE;
/*!40000 ALTER TABLE `enrollment_completed_modules` DISABLE KEYS */;
/*!40000 ALTER TABLE `enrollment_completed_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollments`
--

DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `student_id` bigint NOT NULL,
  `course_id` bigint NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `progress_percent` int DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `enrolled_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_enrollment_student_course` (`student_id`,`course_id`),
  KEY `idx_enrollments_student_id` (`student_id`),
  KEY `idx_enrollments_course_id` (`course_id`),
  CONSTRAINT `fk_enrollment_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_enrollment_student` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollments`
--

LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `function_links`
--

DROP TABLE IF EXISTS `function_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `function_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `route_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_function_links_display_name` (`display_name`),
  UNIQUE KEY `uk_function_links_route_path` (`route_path`),
  KEY `idx_function_links_order_index` (`order_index`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `function_links`
--

LOCK TABLES `function_links` WRITE;
/*!40000 ALTER TABLE `function_links` DISABLE KEYS */;
INSERT INTO `function_links` VALUES (1,'Global Links','/admin/manage-links/global-links',1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(2,'Function Links','/admin/manage-links/function-links',2,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(3,'Primary Links','/admin/manage-links/primary-links',3,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(4,'Role Master','/admin/manage-links/role-master',4,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(5,'User Permissions','/admin/manage-links/permissions',5,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(6,'Groups','/admin/groups',6,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(7,'Users','/users',7,1,'2026-06-16 06:20:08','2026-06-16 06:20:08'),(8,'audit-logs','/audit-logs',8,1,'2026-06-16 06:20:26','2026-06-16 06:20:26'),(9,'myprofile','/profile',9,1,'2026-06-16 06:20:40','2026-06-16 06:20:40'),(10,'Dashboard','/dashboard',10,1,'2026-06-17 06:03:39','2026-06-17 06:03:39'),(11,'mycourses','/courses',11,1,'2026-06-17 09:45:24','2026-06-17 09:45:24'),(12,'mymodules','/modules',12,1,'2026-06-17 09:45:35','2026-06-17 09:45:35'),(13,'myenrollments','/enrollments',13,1,'2026-06-17 09:45:49','2026-06-17 09:45:49');
/*!40000 ALTER TABLE `function_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `global_links`
--

DROP TABLE IF EXISTS `global_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `global_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_global_links_display_name` (`display_name`),
  KEY `idx_global_links_order_index` (`order_index`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `global_links`
--

LOCK TABLES `global_links` WRITE;
/*!40000 ALTER TABLE `global_links` DISABLE KEYS */;
INSERT INTO `global_links` VALUES (1,'Manage Links',2,1,'2026-06-16 11:44:09','2026-06-22 11:23:35'),(2,'Administration',3,1,'2026-06-16 11:44:09','2026-06-17 06:04:49'),(3,'User Management',4,1,'2026-06-16 06:19:53','2026-06-17 06:04:47'),(4,'Dashboard',1,1,'2026-06-17 06:03:21','2026-06-22 11:23:35'),(5,'Academia',5,1,'2026-06-17 09:45:09','2026-06-17 09:45:09');
/*!40000 ALTER TABLE `global_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_master`
--

DROP TABLE IF EXISTS `group_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_master` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_master_name` (`group_name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_master`
--

LOCK TABLES `group_master` WRITE;
/*!40000 ALTER TABLE `group_master` DISABLE KEYS */;
INSERT INTO `group_master` VALUES (1,'Group 1','idk',1,'2026-06-16 08:29:21','2026-06-16 08:29:21'),(2,'Group 2','idk',1,'2026-06-16 10:11:17','2026-06-16 10:11:17'),(3,'Group 3','idk',1,'2026-06-17 04:50:16','2026-06-17 04:50:16'),(4,'System Administration','Root group for super administrators and system management',1,'2026-06-17 07:23:07','2026-06-17 12:11:36'),(5,'Pending Users','Default group for new public registrations',1,'2026-06-17 07:23:07','2026-06-17 07:23:07'),(6,'Group 4','',1,'2026-06-22 10:47:51','2026-06-22 10:47:51');
/*!40000 ALTER TABLE `group_master` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_permissions`
--

DROP TABLE IF EXISTS `group_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` bigint NOT NULL,
  `function_link_id` bigint NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_manage` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_permissions_group_function` (`group_id`,`function_link_id`),
  KEY `idx_group_permissions_group` (`group_id`),
  KEY `idx_group_permissions_function` (`function_link_id`),
  CONSTRAINT `fk_group_permissions_function` FOREIGN KEY (`function_link_id`) REFERENCES `function_links` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_group_permissions_group` FOREIGN KEY (`group_id`) REFERENCES `group_master` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_permissions`
--

LOCK TABLES `group_permissions` WRITE;
/*!40000 ALTER TABLE `group_permissions` DISABLE KEYS */;
INSERT INTO `group_permissions` VALUES (1,1,2,1,1,1,'2026-06-16 08:30:50','2026-06-16 10:05:49'),(2,1,1,1,1,1,'2026-06-16 08:30:50','2026-06-16 10:05:49'),(3,1,3,1,1,1,'2026-06-16 08:30:50','2026-06-16 10:05:13'),(4,1,4,1,1,1,'2026-06-16 08:30:50','2026-06-16 08:30:50'),(5,1,5,1,1,1,'2026-06-16 08:30:50','2026-06-16 08:30:50'),(6,1,6,1,1,1,'2026-06-16 08:30:50','2026-06-16 08:30:50'),(7,1,8,1,1,1,'2026-06-16 08:30:50','2026-06-17 05:21:11'),(8,1,9,1,1,1,'2026-06-16 08:30:50','2026-06-17 05:21:11'),(9,1,7,1,1,1,'2026-06-16 08:30:50','2026-06-17 05:21:11'),(10,2,2,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(11,2,1,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(12,2,3,1,1,1,'2026-06-16 12:20:16','2026-06-16 12:22:43'),(13,2,4,1,1,1,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(14,2,5,1,1,1,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(15,2,6,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(16,2,8,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(17,2,9,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(18,2,7,0,0,0,'2026-06-16 12:20:16','2026-06-16 12:20:16'),(19,1,10,1,1,1,'2026-06-17 06:04:27','2026-06-17 06:04:27'),(20,5,10,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:08:17'),(21,5,2,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:30:20'),(22,5,1,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:30:20'),(23,5,3,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:30:20'),(24,5,4,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:30:20'),(25,5,5,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:30:20'),(26,5,6,0,0,0,'2026-06-17 09:08:17','2026-06-17 09:08:17'),(27,5,8,0,0,0,'2026-06-17 09:08:17','2026-06-17 09:08:17'),(28,5,9,1,1,1,'2026-06-17 09:08:17','2026-06-17 09:08:17'),(29,5,7,0,0,0,'2026-06-17 09:08:17','2026-06-17 09:08:17'),(30,4,10,1,1,1,'2026-06-17 09:48:54','2026-06-17 12:19:22'),(31,4,2,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(32,4,1,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(33,4,3,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(34,4,4,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(35,4,5,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(36,4,6,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(37,4,8,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(38,4,9,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(39,4,7,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(40,4,11,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(41,4,13,1,1,1,'2026-06-17 09:48:54','2026-06-17 09:48:54'),(42,4,12,0,0,0,'2026-06-17 09:48:54','2026-06-17 09:49:02');
/*!40000 ALTER TABLE `group_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `group_role_mapping`
--

DROP TABLE IF EXISTS `group_role_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_role_mapping` (
  `role_id` bigint NOT NULL,
  `group_id` bigint NOT NULL,
  PRIMARY KEY (`role_id`,`group_id`),
  KEY `fk_grm_group` (`group_id`),
  CONSTRAINT `fk_grm_group` FOREIGN KEY (`group_id`) REFERENCES `group_master` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_grm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_role_mapping`
--

LOCK TABLES `group_role_mapping` WRITE;
/*!40000 ALTER TABLE `group_role_mapping` DISABLE KEYS */;
INSERT INTO `group_role_mapping` VALUES (2,1),(3,1),(4,1),(5,1),(6,1),(5,2),(1,4),(1,5),(2,5),(4,5),(5,5);
/*!40000 ALTER TABLE `group_role_mapping` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_history`
--

DROP TABLE IF EXISTS `password_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ph_user_id` (`user_id`),
  KEY `idx_ph_expires_at` (`expires_at`),
  KEY `idx_ph_created_at` (`created_at`),
  CONSTRAINT `fk_ph_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_history`
--

LOCK TABLES `password_history` WRITE;
/*!40000 ALTER TABLE `password_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_password_reset_tokens_token_hash` (`token_hash`),
  KEY `idx_prt_token_hash` (`token_hash`),
  KEY `idx_prt_user_id` (`user_id`),
  KEY `idx_prt_expires_at` (`expires_at`),
  CONSTRAINT `fk_prt_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `primary_links`
--

DROP TABLE IF EXISTS `primary_links`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `primary_links` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `global_link_id` bigint NOT NULL,
  `function_link_id` bigint NOT NULL,
  `display_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_index` int NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_primary_links_scope_route` (`global_link_id`,`function_link_id`,`display_name`),
  KEY `idx_primary_links_global_function_order` (`global_link_id`,`function_link_id`,`order_index`),
  KEY `fk_primary_links_function` (`function_link_id`),
  CONSTRAINT `fk_primary_links_function` FOREIGN KEY (`function_link_id`) REFERENCES `function_links` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_primary_links_global` FOREIGN KEY (`global_link_id`) REFERENCES `global_links` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `primary_links`
--

LOCK TABLES `primary_links` WRITE;
/*!40000 ALTER TABLE `primary_links` DISABLE KEYS */;
INSERT INTO `primary_links` VALUES (1,1,1,'Global Links',1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(2,1,2,'Function Links',2,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(3,1,3,'Primary Links',3,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(4,1,4,'Role Master',4,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(5,1,5,'User Permissions',5,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(8,2,6,'Groups',6,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(9,3,7,'Users',1,1,'2026-06-16 06:20:56','2026-06-16 06:20:56'),(10,3,8,'Audit Logs',1,1,'2026-06-16 06:21:11','2026-06-16 06:21:11'),(11,3,9,'My Profile',1,1,'2026-06-16 06:21:23','2026-06-16 06:21:23'),(12,4,10,'Dashboard',1,1,'2026-06-17 06:03:54','2026-06-17 06:03:54'),(13,5,11,'My Courses',1,1,'2026-06-17 09:46:21','2026-06-17 09:46:21'),(14,5,12,'My Modules',1,1,'2026-06-17 09:46:32','2026-06-17 09:46:32'),(15,5,13,'My Enrollments',1,1,'2026-06-17 09:46:49','2026-06-17 09:48:22');
/*!40000 ALTER TABLE `primary_links` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `function_link_id` bigint NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_manage` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permissions_role_function` (`role_id`,`function_link_id`),
  KEY `idx_role_permissions_role` (`role_id`),
  KEY `idx_role_permissions_function` (`function_link_id`),
  CONSTRAINT `fk_role_permissions_function` FOREIGN KEY (`function_link_id`) REFERENCES `function_links` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1,1,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(2,1,2,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(3,1,3,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(4,1,4,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(5,1,5,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(8,1,6,1,1,1,'2026-06-16 11:44:09','2026-06-16 11:44:09'),(9,1,8,1,1,1,'2026-06-16 06:21:39','2026-06-16 06:21:39'),(10,1,9,1,1,1,'2026-06-16 06:21:39','2026-06-16 06:21:39'),(11,1,7,1,1,1,'2026-06-16 06:21:39','2026-06-16 06:21:39'),(12,2,2,1,1,1,'2026-06-16 06:26:03','2026-06-16 10:12:46'),(13,2,1,1,1,1,'2026-06-16 06:26:03','2026-06-16 10:12:46'),(14,2,3,1,1,1,'2026-06-16 06:26:03','2026-06-16 10:12:46'),(15,2,4,1,1,1,'2026-06-16 06:26:03','2026-06-16 06:26:44'),(16,2,5,1,1,1,'2026-06-16 06:26:03','2026-06-17 04:48:23'),(17,2,6,1,1,1,'2026-06-16 06:26:03','2026-06-16 10:12:51'),(18,2,8,1,1,1,'2026-06-16 06:26:03','2026-06-16 06:27:22'),(19,2,9,1,1,1,'2026-06-16 06:26:03','2026-06-17 09:08:29'),(20,2,7,0,0,0,'2026-06-16 06:26:03','2026-06-16 06:26:03'),(21,5,4,1,1,1,'2026-06-16 12:20:31','2026-06-16 12:22:54'),(22,5,5,1,1,1,'2026-06-16 12:20:31','2026-06-16 12:20:31'),(23,5,3,1,1,1,'2026-06-16 12:22:54','2026-06-16 12:22:54'),(24,1,10,1,1,1,'2026-06-17 06:04:37','2026-06-17 06:04:37'),(25,2,10,1,1,1,'2026-06-17 09:08:29','2026-06-17 09:08:29'),(26,1,11,1,1,1,'2026-06-17 09:47:24','2026-06-17 09:47:24'),(27,1,13,1,1,1,'2026-06-17 09:47:24','2026-06-17 09:49:31'),(28,1,12,1,1,1,'2026-06-17 09:47:24','2026-06-17 09:47:24');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `system_role` tinyint(1) NOT NULL DEFAULT '0',
  `assignable` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`code`),
  KEY `idx_roles_active` (`active`),
  KEY `idx_roles_assignable` (`assignable`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SUPER_ADMIN','Super Admin','Global platform administration across all groups',1,1,1,5,'2026-06-16 11:44:08','2026-06-17 07:27:11'),(2,'ADMIN','Admin','Full platform administration',1,1,1,10,'2026-06-16 11:44:08','2026-06-17 07:26:35'),(3,'TRAINER','Trainer','Course and module management',1,1,1,20,'2026-06-16 11:44:08','2026-06-23 03:41:51'),(4,'STUDENT','Student','Learner access',1,1,1,30,'2026-06-16 11:44:08','2026-06-17 07:26:42'),(5,'SAMPLE_ROLE_1','Role_1','idk',1,0,1,0,'2026-06-16 10:08:31','2026-06-17 07:26:48'),(6,'ROLEBYADMIN1','RoleByAdmin1','idk',1,0,1,0,'2026-06-17 06:34:19','2026-06-17 06:34:19');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `security_audit_logs`
--

DROP TABLE IF EXISTS `security_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `security_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `event_type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `outcome` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `context_info` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `details` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sal_user_id` (`user_id`),
  KEY `idx_sal_event_type` (`event_type`),
  KEY `idx_sal_created_at` (`created_at`),
  CONSTRAINT `fk_sal_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=178 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `security_audit_logs`
--

LOCK TABLES `security_audit_logs` WRITE;
/*!40000 ALTER TABLE `security_audit_logs` DISABLE KEYS */;
INSERT INTO `security_audit_logs` VALUES (1,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 06:14:45'),(2,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 06:26:05'),(3,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 06:26:09'),(4,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 06:26:16'),(5,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 06:26:20'),(6,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 06:26:46'),(7,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 06:26:51'),(8,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 06:26:59'),(9,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 06:27:04'),(10,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 06:27:24'),(11,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 06:27:29'),(12,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 06:27:32'),(13,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 06:27:36'),(14,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 08:28:08'),(15,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 08:32:05'),(16,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 08:32:09'),(17,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 08:32:15'),(18,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 08:32:17'),(19,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 08:32:23'),(20,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 08:32:27'),(21,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 10:04:10'),(22,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 10:06:44'),(23,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 10:06:48'),(24,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 10:07:18'),(25,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 10:07:22'),(26,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 10:13:04'),(27,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 10:13:09'),(28,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 10:19:34'),(29,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 10:19:48'),(30,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 10:19:53'),(31,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 11:35:19'),(32,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 12:15:11'),(33,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 12:15:13'),(34,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 12:16:08'),(35,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 12:16:52'),(36,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 12:21:47'),(37,NULL,'LOGIN_FAILED','FAILURE','0:0:0:0:0:0:0:1','Edge','r1ui@gmail.com','Invalid login credentials','2026-06-16 12:22:08'),(38,4,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User authenticated successfully','2026-06-16 12:22:14'),(39,4,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User logged out successfully','2026-06-16 12:22:22'),(40,4,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User authenticated successfully','2026-06-16 12:22:26'),(41,4,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User logged out successfully','2026-06-16 12:22:29'),(42,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 12:22:33'),(43,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-16 12:23:00'),(44,4,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User authenticated successfully','2026-06-16 12:23:05'),(45,4,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User logged out successfully','2026-06-16 12:23:31'),(46,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 12:23:36'),(47,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 12:24:11'),(48,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-16 12:27:29'),(49,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-16 12:27:42'),(50,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-16 12:27:47'),(51,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 04:05:26'),(52,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 04:43:58'),(53,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 04:44:11'),(54,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-17 04:44:15'),(55,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-17 04:44:39'),(56,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 04:45:40'),(57,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 04:47:01'),(58,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-17 04:47:06'),(59,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-17 04:47:20'),(60,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 04:47:24'),(61,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 04:51:05'),(62,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 05:13:42'),(63,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 05:17:10'),(64,6,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin1@gmail.com','User authenticated successfully','2026-06-17 05:17:20'),(65,6,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin1@gmail.com','User logged out successfully','2026-06-17 05:17:55'),(66,6,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin1@gmail.com','User authenticated successfully','2026-06-17 05:17:59'),(67,6,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin1@gmail.com','User logged out successfully','2026-06-17 05:18:41'),(68,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 05:19:18'),(69,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 06:02:58'),(70,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 06:04:56'),(71,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 06:04:58'),(72,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 06:33:41'),(73,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 06:33:44'),(74,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 06:33:52'),(75,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-17 06:33:59'),(76,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-17 06:34:22'),(77,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 06:34:28'),(78,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 07:26:08'),(79,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 07:27:13'),(80,7,'USER_REGISTERED','SUCCESS',NULL,NULL,'superadmin2@gmail.com','New SUPER_ADMIN account registered','2026-06-17 07:32:10'),(81,7,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User authenticated successfully','2026-06-17 07:32:23'),(82,8,'USER_REGISTERED','SUCCESS',NULL,NULL,'su1@gmail.com','New ADMIN account registered','2026-06-17 09:06:11'),(83,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:06:23'),(84,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:07:24'),(85,7,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User authenticated successfully','2026-06-17 09:07:27'),(86,7,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User logged out successfully','2026-06-17 09:09:06'),(87,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:09:09'),(88,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:09:28'),(89,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:09:35'),(90,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 09:09:57'),(91,4,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User authenticated successfully','2026-06-17 09:10:01'),(92,4,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u1@gmail.com','User logged out successfully','2026-06-17 09:10:05'),(93,9,'USER_REGISTERED','SUCCESS',NULL,NULL,'r1u2@gmail.com','New SAMPLE_ROLE_1 account registered','2026-06-17 09:10:53'),(94,9,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u2@gmail.com','User authenticated successfully','2026-06-17 09:11:04'),(95,9,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','r1u2@gmail.com','User logged out successfully','2026-06-17 09:11:06'),(96,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:18:58'),(97,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:19:06'),(98,7,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User authenticated successfully','2026-06-17 09:19:15'),(99,7,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User logged out successfully','2026-06-17 09:19:19'),(100,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:19:25'),(101,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:19:40'),(102,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:19:42'),(103,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:22:12'),(104,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:22:15'),(105,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:23:09'),(106,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:23:12'),(107,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:23:17'),(108,7,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User authenticated successfully','2026-06-17 09:23:24'),(109,7,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin2@gmail.com','User logged out successfully','2026-06-17 09:24:19'),(110,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:24:23'),(111,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:24:33'),(112,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:24:52'),(113,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:27:11'),(114,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:27:16'),(115,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:29:47'),(116,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:29:53'),(117,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 09:30:23'),(118,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:30:29'),(119,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:30:39'),(120,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:30:42'),(121,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:30:45'),(122,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:30:52'),(123,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 09:31:40'),(124,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:31:44'),(125,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:31:50'),(126,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:31:57'),(127,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 09:32:28'),(128,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:32:33'),(129,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:33:27'),(130,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:33:30'),(131,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 09:38:42'),(132,8,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User authenticated successfully','2026-06-17 09:38:46'),(133,8,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','su1@gmail.com','User logged out successfully','2026-06-17 09:38:55'),(134,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 09:44:35'),(135,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 10:03:26'),(136,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 10:03:47'),(137,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 10:22:43'),(138,NULL,'LOGIN_FAILED','FAILURE','0:0:0:0:0:0:0:1','Edge','student1@gmail.com','Invalid login credentials','2026-06-17 10:22:50'),(139,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 10:22:58'),(140,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 10:23:06'),(141,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 10:23:14'),(142,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 10:23:25'),(143,5,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','s1@gmail.com','User authenticated successfully','2026-06-17 10:23:34'),(144,5,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','s1@gmail.com','User logged out successfully','2026-06-17 10:24:08'),(145,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 11:35:48'),(146,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 11:53:02'),(147,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 11:53:32'),(148,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 11:53:48'),(149,10,'USER_REGISTERED','SUCCESS',NULL,NULL,'superadmin3@gmail.com','New SUPER_ADMIN account registered','2026-06-17 11:55:13'),(150,10,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin3@gmail.com','User authenticated successfully','2026-06-17 11:55:26'),(151,10,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin3@gmail.com','User logged out successfully','2026-06-17 11:55:49'),(152,11,'USER_REGISTERED','SUCCESS',NULL,NULL,'admin3@gmail.com','New ADMIN account registered','2026-06-17 11:57:00'),(153,11,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin3@gmail.com','User authenticated successfully','2026-06-17 11:57:13'),(154,11,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin3@gmail.com','User logged out successfully','2026-06-17 11:57:17'),(155,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 11:57:26'),(156,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-17 12:01:46'),(157,3,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User authenticated successfully','2026-06-17 12:01:53'),(158,3,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','admin@gmail.com','User logged out successfully','2026-06-17 12:10:26'),(159,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-17 12:10:34'),(160,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 03:53:15'),(161,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-22 05:06:13'),(162,1,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','oauth.tester@securelms.local','User logged out successfully','2026-06-22 05:06:42'),(163,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 05:06:44'),(164,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 07:16:27'),(165,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 09:52:51'),(166,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-22 10:15:24'),(167,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 10:15:28'),(168,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-22 10:53:23'),(169,2,'LOGIN_FAILED','FAILURE','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','Invalid login credentials','2026-06-22 10:53:29'),(170,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 10:53:32'),(171,2,'LOGOUT','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User logged out successfully','2026-06-22 11:00:46'),(172,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 11:00:48'),(173,8,'ACCOUNT_LOCKED_BY_ADMIN','SUCCESS',NULL,NULL,'su1@gmail.com','Admin locked account','2026-06-22 11:02:36'),(174,8,'ACCOUNT_UNLOCKED_ADMIN','SUCCESS',NULL,NULL,'su1@gmail.com','Admin unlocked account','2026-06-22 11:02:42'),(175,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-22 11:58:26'),(176,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-23 03:42:23'),(177,2,'LOGIN_SUCCESS','SUCCESS','0:0:0:0:0:0:0:1','Edge','superadmin@securelms.com','User authenticated successfully','2026-06-23 04:02:46');
/*!40000 ALTER TABLE `security_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_permissions`
--

DROP TABLE IF EXISTS `user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `function_link_id` bigint NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_add` tinyint(1) NOT NULL DEFAULT '0',
  `can_manage` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_permissions_user_function` (`user_id`,`function_link_id`),
  KEY `idx_user_permissions_user` (`user_id`),
  KEY `idx_user_permissions_function` (`function_link_id`),
  CONSTRAINT `fk_user_permissions_function` FOREIGN KEY (`function_link_id`) REFERENCES `function_links` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_user_permissions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_permissions`
--

LOCK TABLES `user_permissions` WRITE;
/*!40000 ALTER TABLE `user_permissions` DISABLE KEYS */;
INSERT INTO `user_permissions` VALUES (13,2,13,0,0,0,'2026-06-17 09:50:27','2026-06-17 09:50:27'),(14,5,6,1,0,0,'2026-06-17 10:22:39','2026-06-17 10:22:39'),(15,2,5,0,0,0,'2026-06-17 11:51:27','2026-06-17 11:51:27'),(16,3,7,1,1,1,'2026-06-17 12:01:44','2026-06-17 12:01:44');
/*!40000 ALTER TABLE `user_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_number` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadhar_number` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role_id` bigint NOT NULL,
  `group_id` bigint DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `account_non_locked` tinyint(1) NOT NULL DEFAULT '1',
  `failed_login_attempts` int NOT NULL DEFAULT '0',
  `lockout_level` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `password_changed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_email_hash` (`email_hash`),
  UNIQUE KEY `uk_users_aadhar_number` (`aadhar_number`),
  KEY `idx_user_email_hash` (`email_hash`),
  KEY `idx_user_username` (`username`),
  KEY `idx_users_role_id` (`role_id`),
  KEY `idx_users_active` (`active`),
  KEY `fk_users_group` (`group_id`),
  CONSTRAINT `fk_users_group` FOREIGN KEY (`group_id`) REFERENCES `group_master` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'oauth_tester','oauth.tester@securelms.local','223dfcf3d7dcd4a0bbf00e4b42e54b234c18b81cce03f8bda5c4fc1e13c88f52','$2a$12$WywD6ThWQmQ3FB3I6buisuWFxJXXtvjRYe6/hdBj8Oj/A5ITIvTKe','OAuth','Tester',NULL,NULL,4,NULL,1,1,0,0,NULL,'2026-06-16 06:14:26','2026-06-16 06:14:26','2026-06-16 06:14:26'),(2,'superadmin','superadmin@securelms.com','ce284a1fb53941b19b12d2cbbb6243f4a8c9336ae0a276a70ea888a286b998c4','$2a$12$p3XmQ.6.F3zZ5DYyFD2wy.heKUO8ht6wrQrj.uiq.A4PfIT3.YY5O','Super','Admin','9999999999','000000000000',1,4,1,1,0,0,NULL,'2026-06-16 06:14:26','2026-06-16 06:14:26','2026-06-22 10:53:32'),(3,'admin0','admin@gmail.com','cf39cfd1435bc7ed1eb1223c8f76941a453e51cd0691e36c9701ae98b8adb958','$2a$12$ntrYLz3UuX2KwlaW90tncOcZDTQ3CML7/4sc4zfwPfYaxLD2dusQe','Admin','Zero','9123123123','987777777788',2,1,1,1,0,0,NULL,'2026-06-16 06:25:29','2026-06-16 06:25:29','2026-06-16 08:29:22'),(4,'r1u1','r1u1@gmail.com','347774a7f4d9f90d966147c9e85343d817b3dbcdafe33bf348ccfeec43d4e787','$2a$12$dXvnE83oWangloKSFIBXnu.NZdlZ7EWazBJvqaYdVmfiHasn5x8ca','Role one','User One','9832798347','928132891831',5,2,1,1,0,0,NULL,'2026-06-16 10:09:38','2026-06-16 10:09:38','2026-06-16 10:11:38'),(5,'student1','s1@gmail.com','907fc92ff5a8c6e5434e630439e03d8beda4570cebfb3c5dedee79c18205ad93','$2a$12$zZTtD/CGXtAvNa66P12Mh.HVTbZBUwAZ77qMYFtcqCMBIdIlE6gG2','student','one','8921982381','912479015389',4,1,1,1,0,0,NULL,'2026-06-16 10:10:36','2026-06-16 10:10:36','2026-06-16 10:11:30'),(6,'admin1','admin1@gmail.com','1077d43344a00aaa2d5eda7af707ad6ed0bd409893e11109d32a6b55b4e890c4','$2a$12$LKxtQ8kOLF2Qkuw0KeJoHuQYBdtZA71iliUB3vyDlbhP.M166s6Ri','Admin','One','9888888888','978888888888',2,NULL,1,1,0,0,NULL,'2026-06-17 05:17:01','2026-06-17 05:17:01','2026-06-17 05:17:01'),(7,'superadmin2','superadmin2@gmail.com','576528a09abb3e0c7da5f8201aa03d4ce2cce3dd2702f8831746831404ad1269','$2a$12$jHuTllCknXVWPTUWQ/lJbedvhxIMaNSIk4uvkDiJjapi6GdehENOW','Super Admin','Second','9892998398','213124231535',1,4,1,1,0,0,NULL,'2026-06-17 07:32:10','2026-06-17 07:32:10','2026-06-17 07:32:10'),(8,'su1','su1@gmail.com','96ee8bde8d50f0aad34a24b7428e920f1885acfd155784dcb757a289deb641b2','$2a$12$UU4.kcHpZad/ne0Y6AbjW.ZUXiEz/7.teYHaoTMBl1o9gI18xEA5m','Sample User','one','9342681474','981859393132',2,5,1,1,0,0,NULL,'2026-06-17 09:06:11','2026-06-17 09:06:11','2026-06-22 11:02:42'),(9,'r1u2','r1u2@gmail.com','1b04f68d931b83cf756a542392b1cfbc7bb5cfae2bb1eb5a33f9addf3969db4c','$2a$12$Tj7OMxOESncU5n2GW439BerCXv7uYutl0MkG2pv3QJYtB3yiiftUS','Role One','User two','9421884212','513462573456',5,5,1,1,0,0,NULL,'2026-06-17 09:10:53','2026-06-17 09:10:53','2026-06-17 09:10:53'),(10,'superadmin3','superadmin3@gmail.com','a0a03143fbc42f38c738b6aed43bf9105a6a23acb25e1e997f4934e87de81714','$2a$12$qmbnGES8mAuiGuCBdhsPq.c6zTAEIhIpikbcqGXqxUu9qH6DZFB8.','Super Admin','Three','9884353843','671631731731',1,4,1,1,0,0,NULL,'2026-06-17 11:55:13','2026-06-17 11:55:13','2026-06-17 11:55:13'),(11,'admin3','admin3@gmail.com','2c4f374fa35ddb8979c91e44939f8efd94b37d5c700e0750c6cbb6f99c301eec','$2a$12$GkH3JdLPkLnEuzrfYDIJoOGXos.//.NsDdd5z3sX1gsOCDfu2Yi4W','Admin','Four','9895835925','412761487148',2,5,1,1,0,0,NULL,'2026-06-17 11:57:00','2026-06-17 11:57:00','2026-06-17 11:57:00');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'secure_lms_db'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-23 10:13:29
