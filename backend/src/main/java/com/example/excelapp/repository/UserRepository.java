
package com.example.excelapp.repository;
import com.example.excelapp.entity.user;
import org.springframework.data.jpa.repository.JpaRepository;


public interface UserRepository extends JpaRepository<user, Long> {
}